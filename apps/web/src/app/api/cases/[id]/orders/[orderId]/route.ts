import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { invalidateMatterContext } from '@/lib/ai/context/cache';
import { CERTIFIED_COPY_STATUSES } from '@/lib/domain/court-order';

/**
 * Advances a Court Order's certified_copy_status over time (PENDING ->
 * APPLIED_FOR -> RECEIVED) and/or attaches a document_id when the scanned
 * order copy is uploaded after the order was first recorded. This is the
 * only mutation this route supports — every other field on a Court Order
 * (order_date, summary, court_note_id) is set once at creation and never
 * edited, same spirit as CourtNote being append-only, just enforced here
 * at the API layer rather than by revoking the DB grant (certified copy
 * status genuinely needs to change).
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const UpdateCourtOrderSchema = z
  .object({
    certified_copy_status: z.enum(CERTIFIED_COPY_STATUSES),
    document_id: z.string().regex(UUID_PATTERN, 'Invalid document id').nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided.' });

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

type RouteParams = { params: Promise<{ id: string; orderId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, orderId } = await params;
    if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(orderId)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid case or order id.' }, { status: 400 });
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

    const result = UpdateCourtOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid update payload.', details: result.error.format() },
        { status: 400 }
      );
    }
    const fields = result.data;
    const db = new DatabaseClient();

    if (Object.prototype.hasOwnProperty.call(fields, 'document_id') && fields.document_id) {
      const docRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "DocumentEnvelope" WHERE id = $1`,
        [fields.document_id]
      );
      if (docRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'document_id does not refer to an accessible document.' },
          { status: 400 }
        );
      }
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`"${key}" = $${paramIndex}`);
      values.push(value);
      paramIndex += 1;
    }
    setClauses.push(`"updated_at" = now()`);
    values.push(id, orderId);

    const rows = await db.execute<CourtOrderRow>(
      session.tenantId,
      `UPDATE "CourtOrder"
       SET ${setClauses.join(', ')}
       WHERE case_id = $${paramIndex} AND id = $${paramIndex + 1}
       RETURNING ${COURT_ORDER_COLUMNS}`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    if (rows[0].matter_id) {
      await invalidateMatterContext(session.tenantId, rows[0].matter_id);
    }

    return NextResponse.json({ order: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[COURT_ORDERS_API] PATCH /api/cases/[id]/orders/[orderId] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
