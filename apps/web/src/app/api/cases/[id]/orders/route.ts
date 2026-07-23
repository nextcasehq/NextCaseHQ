import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { invalidateMatterContext } from '@/lib/ai/context/cache';
import { defaultCertifiedCopyStatus } from '@/lib/domain/court-order';

/**
 * Court Orders as first-class records (Case Diary Phase 1 closure) — see
 * db/schema.sql's CourtOrder table. Mirrors /api/cases/[id]/court-notes'
 * structure: case-scoped, matter_id denormalized at insert time, tenant
 * ownership of every referenced id (court_note_id, document_id) re-verified
 * through an RLS-scoped SELECT before trusting it, same rule as matter_id
 * linkage on /api/cases (an FK check alone bypasses RLS).
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface CourtOrderRow {
  id: string;
  tenant_id: string;
  case_id: string;
  matter_id: string | null;
  court_note_id: string | null;
  author_user_id: string;
  order_date: string;
  summary: string;
  document_id: string | null;
  certified_copy_required: boolean;
  certified_copy_status: string;
  created_at: string;
  updated_at: string;
}

const COURT_ORDER_COLUMNS = `id, tenant_id, case_id, matter_id, court_note_id, author_user_id, order_date,
                             summary, document_id, certified_copy_required, certified_copy_status,
                             created_at, updated_at`;

const CreateCourtOrderSchema = z.object({
  order_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD'),
  summary: z.string().min(1).max(5000),
  court_note_id: z.string().regex(UUID_PATTERN, 'Invalid court note id').nullable().optional(),
  document_id: z.string().regex(UUID_PATTERN, 'Invalid document id').nullable().optional(),
  certified_copy_required: z.boolean().optional().default(false),
});

async function resolveSession(request: NextRequest) {
  try {
    return await requireSession(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    throw error;
  }
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid case id.' }, { status: 400 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const db = new DatabaseClient();
    const rows = await db.execute<CourtOrderRow>(
      session.tenantId,
      `SELECT ${COURT_ORDER_COLUMNS} FROM "CourtOrder" WHERE case_id = $1 ORDER BY order_date DESC, created_at DESC`,
      [id]
    );

    return NextResponse.json({ orders: rows }, { status: 200 });
  } catch (error) {
    console.error('[COURT_ORDERS_API] GET /api/cases/[id]/orders failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid case id.' }, { status: 400 });
    }

    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Malformed JSON body.' }, { status: 400 });
    }

    const result = CreateCourtOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid Court Order payload.', details: result.error.format() },
        { status: 400 }
      );
    }
    const input = result.data;
    const db = new DatabaseClient();

    const caseRows = await db.execute<{ id: string; matter_id: string | null }>(
      session.tenantId,
      `SELECT id, matter_id FROM "LegalCase" WHERE id = $1`,
      [id]
    );
    if (caseRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Case not found.' }, { status: 404 });
    }
    const matterId = caseRows[0].matter_id;

    if (matterId) {
      const matterRows = await db.execute<{ status: string }>(
        session.tenantId,
        `SELECT status FROM "Matter" WHERE id = $1`,
        [matterId]
      );
      if (matterRows.length > 0 && matterRows[0].status === 'CLOSED') {
        return NextResponse.json(
          {
            error: 'CONFLICT',
            code: 'MATTER_CLOSED_READ_ONLY',
            message: 'The Matter linked to this Proceeding is closed. Reopen it before recording new Court Orders.',
          },
          { status: 409 }
        );
      }
    }

    // A court_note_id belonging to a different Proceeding (or a different
    // tenant entirely) would let an order appear "connected to that
    // hearing" when it isn't — re-verify it resolves to THIS case_id under
    // RLS before trusting it.
    if (input.court_note_id) {
      const noteRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "CourtNote" WHERE id = $1 AND case_id = $2`,
        [input.court_note_id, id]
      );
      if (noteRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'court_note_id does not refer to a Court Note on this Proceeding.' },
          { status: 400 }
        );
      }
    }

    // Same rule as matter_id/court_note_id above: a DocumentEnvelope id FK
    // check bypasses RLS, so re-verify tenant ownership explicitly.
    if (input.document_id) {
      const docRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "DocumentEnvelope" WHERE id = $1`,
        [input.document_id]
      );
      if (docRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'document_id does not refer to an accessible document.' },
          { status: 400 }
        );
      }
    }

    const certifiedCopyStatus = defaultCertifiedCopyStatus(input.certified_copy_required);
    const summaryPreview = input.summary.length > 160 ? `${input.summary.slice(0, 157)}...` : input.summary;

    const rows = await db.execute<CourtOrderRow>(
      session.tenantId,
      `WITH inserted_order AS (
         INSERT INTO "CourtOrder" (
           tenant_id, case_id, matter_id, court_note_id, author_user_id, order_date, summary,
           document_id, certified_copy_required, certified_copy_status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${COURT_ORDER_COLUMNS}
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $3, $6::date, $11, 'ORDER', $5
         WHERE $3 IS NOT NULL
         RETURNING id
       )
       SELECT * FROM inserted_order`,
      [
        session.tenantId,
        id,
        matterId,
        input.court_note_id ?? null,
        session.sub,
        input.order_date,
        input.summary,
        input.document_id ?? null,
        input.certified_copy_required,
        certifiedCopyStatus,
        `Court Order recorded: ${summaryPreview}`,
      ]
    );

    if (matterId) {
      await invalidateMatterContext(session.tenantId, matterId);
    }

    return NextResponse.json({ order: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[COURT_ORDERS_API] POST /api/cases/[id]/orders failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
