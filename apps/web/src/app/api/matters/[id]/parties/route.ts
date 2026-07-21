import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { REPRESENTED_SIDES } from '@/lib/domain/matter-party';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Parties and procedural roles (Production Matter Register Foundation).
 * A role change between proceedings (e.g. Plaintiff at trial -> Respondent
 * on appeal) is always a NEW MatterParty row, scoped to the new
 * proceeding_id — POST never edits an existing party row's role in place,
 * so the earlier role is never overwritten.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const RepresentedSideSchema = z.enum(REPRESENTED_SIDES);

interface MatterPartyRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  proceeding_id: string | null;
  display_name: string;
  full_legal_name: string | null;
  represented_side: string;
  procedural_role: string;
  earlier_procedural_role: string | null;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const PARTY_COLUMNS = `id, tenant_id, matter_id, proceeding_id, display_name, full_legal_name,
                       represented_side, procedural_role, earlier_procedural_role, is_active,
                       effective_from, effective_to, created_by, created_at, updated_at`;

const CreatePartySchema = z.object({
  proceeding_id: z.string().regex(UUID_PATTERN, 'Invalid proceeding id').nullable().optional(),
  display_name: z.string().min(1).max(300),
  full_legal_name: z.string().max(500).nullable().optional(),
  represented_side: RepresentedSideSchema.optional().default('OUR_CLIENT'),
  procedural_role: z.string().min(1).max(200),
  earlier_procedural_role: z.string().max(200).nullable().optional(),
  effective_from: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable().optional(),
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
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid matter id.' }, { status: 400 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const db = new DatabaseClient();
    const matterRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (matterRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const rows = await db.execute<MatterPartyRow>(
      session.tenantId,
      `SELECT ${PARTY_COLUMNS} FROM "MatterParty" WHERE matter_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({ parties: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_PARTIES_API] GET /api/matters/[id]/parties failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid matter id.' }, { status: 400 });
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

    const result = CreatePartySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid party payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();

    const matterRows = await db.execute<{ id: string; status: string }>(
      session.tenantId,
      `SELECT id, status FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (matterRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Matter not found.' }, { status: 404 });
    }
    if (matterRows[0].status === 'CLOSED') {
      return NextResponse.json(
        { error: 'CONFLICT', code: 'MATTER_CLOSED_READ_ONLY', message: 'This Matter Register is closed and read-only.' },
        { status: 409 }
      );
    }

    // A proceeding_id FK check bypasses RLS — re-verify ownership and that
    // it actually belongs to this matter before trusting it.
    if (input.proceeding_id) {
      const proceedingRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "LegalCase" WHERE id = $1 AND matter_id = $2`,
        [input.proceeding_id, id]
      );
      if (proceedingRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'proceeding_id does not refer to a proceeding under this matter.' },
          { status: 400 }
        );
      }
    }

    const rows = await db.execute<MatterPartyRow>(
      session.tenantId,
      `WITH inserted AS (
         INSERT INTO "MatterParty"
           (tenant_id, matter_id, proceeding_id, display_name, full_legal_name, represented_side,
            procedural_role, earlier_procedural_role, effective_from, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${PARTY_COLUMNS}
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $2, CURRENT_DATE, $11, 'PARTY_ADDED', $10
         RETURNING id
       )
       SELECT * FROM inserted`,
      [
        session.tenantId,
        id,
        input.proceeding_id ?? null,
        input.display_name,
        input.full_legal_name ?? null,
        input.represented_side,
        input.procedural_role,
        input.earlier_procedural_role ?? null,
        input.effective_from ?? null,
        session.sub,
        `Party added: ${input.display_name} (${input.procedural_role})`,
      ]
    );

    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ party: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[MATTER_PARTIES_API] POST /api/matters/[id]/parties failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
