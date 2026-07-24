import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { MATTER_STATUSES, MATTER_ENGAGEMENT_TYPES, MATTER_CATEGORIES } from '@/lib/domain/matter';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

const MatterStatusSchema = z.enum(MATTER_STATUSES);
const MatterEngagementTypeSchema = z.enum(MATTER_ENGAGEMENT_TYPES);
const MatterCategorySchema = z.enum(MATTER_CATEGORIES);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface MatterRow {
  id: string;
  tenant_id: string;
  title: string;
  matter_number: string | null;
  engagement_type: string;
  practice_area: string | null;
  status: string;
  client_id: string | null;
  opposing_party_name: string | null;
  opposing_counsel: string | null;
  court: string | null;
  bench: string | null;
  judge: string | null;
  description: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string | null;
  advocate_reference_number: string | null;
  matter_category: string | null;
  state: string | null;
  district: string | null;
  court_establishment: string | null;
  case_type: string | null;
  filing_number: string | null;
  matter_year: number | null;
  cnr_number: string | null;
  current_stage: string | null;
  next_hearing_date: string | null;
  current_proceeding_id: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
}

// next_hearing_date is cast to text — see the matching comment in
// api/matters/route.ts's own MATTER_COLUMNS for why (DATE columns
// round-trip through node-pg as a JS Date, which JSON-serializes as a
// full UTC timestamp instead of plain YYYY-MM-DD).
const MATTER_COLUMNS = `m.id, m.tenant_id, m.title, m.matter_number, m.engagement_type, m.practice_area,
                        m.status, m.client_id, m.opposing_party_name, m.opposing_counsel, m.court,
                        m.bench, m.judge, m.description, m.opened_at, m.closed_at, m.created_at,
                        m.updated_at, c.name AS client_name, m.advocate_reference_number, m.matter_category,
                        m.state, m.district, m.court_establishment, m.case_type, m.filing_number,
                        m.matter_year, m.cnr_number, m.current_stage, m.next_hearing_date::text AS next_hearing_date,
                        m.current_proceeding_id, m.created_by_user_id, m.updated_by_user_id`;

const UpdateMatterSchema = z
  .object({
    title: z.string().min(1).max(500),
    matter_number: z.string().max(200).nullable(),
    engagement_type: MatterEngagementTypeSchema,
    practice_area: z.string().max(300).nullable(),
    status: MatterStatusSchema,
    client_id: z.string().regex(UUID_PATTERN, 'Invalid client id').nullable(),
    opposing_party_name: z.string().max(300).nullable(),
    opposing_counsel: z.string().max(300).nullable(),
    court: z.string().max(300).nullable(),
    bench: z.string().max(300).nullable(),
    judge: z.string().max(300).nullable(),
    description: z.string().max(10000).nullable(),
    closed_at: z.string().datetime().nullable(),
    advocate_reference_number: z.string().max(200).nullable(),
    matter_category: MatterCategorySchema.nullable(),
    state: z.string().max(200).nullable(),
    district: z.string().max(200).nullable(),
    court_establishment: z.string().max(300).nullable(),
    case_type: z.string().max(200).nullable(),
    filing_number: z.string().max(200).nullable(),
    matter_year: z.number().int().min(1900).max(2100).nullable(),
    cnr_number: z.string().max(50).nullable(),
    current_stage: z.string().max(300).nullable(),
    next_hearing_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable(),
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
    // RLS scopes this to the caller's own tenant — a valid UUID belonging to
    // another tenant returns zero rows here, not a permission leak.
    const rows = await db.execute<MatterRow>(
      session.tenantId,
      `SELECT ${MATTER_COLUMNS}
       FROM "Matter" m LEFT JOIN "Client" c ON c.id = m.client_id
       WHERE m.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ matter: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[MATTERS_API] GET /api/matters/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const result = UpdateMatterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid update payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const fields = result.data;
    const db = new DatabaseClient();

    // A closed Matter Register is read-only: no ordinary field edit is
    // permitted while status = CLOSED — the only sanctioned way out of that
    // state is the dedicated, audited POST /api/matters/[id]/reopen flow.
    const statusRows = await db.execute<{ status: string }>(
      session.tenantId,
      `SELECT status FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (statusRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (statusRows[0].status === 'CLOSED') {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          code: 'MATTER_CLOSED_READ_ONLY',
          message: 'This Matter Register is closed and read-only. Reopen it first via POST /api/matters/[id]/reopen.',
        },
        { status: 409 }
      );
    }

    if (Object.prototype.hasOwnProperty.call(fields, 'client_id') && fields.client_id) {
      // A client_id FK check bypasses RLS — re-verify ownership through an
      // RLS-scoped query before trusting it (same rule as POST /api/matters).
      const clientRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "Client" WHERE id = $1`,
        [fields.client_id]
      );
      if (clientRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'client_id does not refer to an existing client.' },
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
    setClauses.push(`"updated_by_user_id" = $${paramIndex}`);
    values.push(session.sub);
    paramIndex += 1;
    values.push(id);

    const rows = await db.execute<MatterRow>(
      session.tenantId,
      `WITH updated AS (
         UPDATE "Matter"
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, tenant_id, title, matter_number, engagement_type, practice_area, status,
                   client_id, opposing_party_name, opposing_counsel, court, bench, judge,
                   description, opened_at, closed_at, created_at, updated_at,
                   advocate_reference_number, matter_category, state, district, court_establishment,
                   case_type, filing_number, matter_year, cnr_number, current_stage, next_hearing_date,
                   current_proceeding_id, created_by_user_id, updated_by_user_id
       )
       SELECT ${MATTER_COLUMNS} FROM updated m LEFT JOIN "Client" c ON c.id = m.client_id`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ matter: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[MATTERS_API] PATCH /api/matters/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const db = new DatabaseClient();

    // RLS scopes this to the caller's own tenant — a matter belonging to
    // another tenant is indistinguishable from a nonexistent one, so a
    // cross-tenant id returns 404 here without ever running the dependent
    // checks below (which would otherwise also just see zero rows, but
    // there's no reason to run them for an id this tenant can't see).
    const matterRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (matterRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    // MatterParticipant and MatterEvent are ON DELETE CASCADE at the schema
    // level (see db/schema.sql), and DocumentEnvelope.matter_id is RESTRICT
    // (Sprint 3, PR 3A), but this endpoint deliberately does not rely on
    // either: every dependent record type is checked up front and blocks
    // deletion if any exist, so a Matter is never deleted out from under
    // linked Proceedings/participants/chronology/documents without an
    // explicit, separate action to remove them first.
    const [proceedingRows, participantRows, eventRows, documentRows, taskRows] = await Promise.all([
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "LegalCase" WHERE matter_id = $1`,
        [id]
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "MatterParticipant" WHERE matter_id = $1`,
        [id]
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "MatterEvent" WHERE matter_id = $1`,
        [id]
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "DocumentEnvelope" WHERE matter_id = $1`,
        [id]
      ),
      // MatterTask.matter_id is ON DELETE CASCADE (Product Direction,
      // Milestone 2) — checked explicitly anyway, same reasoning as
      // MatterEvent/MatterParticipant above: a Matter with real,
      // unresolved pending actions should not disappear silently.
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "MatterTask" WHERE matter_id = $1`,
        [id]
      ),
    ]);

    const linked = {
      proceedings: proceedingRows[0].count,
      participants: participantRows[0].count,
      events: eventRows[0].count,
      documents: documentRows[0].count,
      tasks: taskRows[0].count,
    };

    if (linked.proceedings > 0 || linked.participants > 0 || linked.events > 0 || linked.documents > 0 || linked.tasks > 0) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          code: 'MATTER_HAS_LINKED_RECORDS',
          message:
            'This matter still has linked proceedings, participants, chronology entries, or documents. Remove, reassign, or archive them before deleting this matter.',
          linked,
        },
        { status: 409 }
      );
    }

    let rows: { id: string }[];
    try {
      rows = await db.execute<{ id: string }>(
        session.tenantId,
        `DELETE FROM "Matter" WHERE id = $1 RETURNING id`,
        [id]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('foreign key constraint')) {
        // Defense in depth against a dependent row created in the narrow
        // window between the checks above and this delete — still a
        // deterministic 409, never a raw 500 leaking a Postgres error.
        return NextResponse.json(
          {
            error: 'CONFLICT',
            code: 'MATTER_HAS_LINKED_RECORDS',
            message: 'This matter still has linked records. Remove, reassign, or archive them before deleting this matter.',
          },
          { status: 409 }
        );
      }
      throw error;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    console.error('[MATTERS_API] DELETE /api/matters/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
