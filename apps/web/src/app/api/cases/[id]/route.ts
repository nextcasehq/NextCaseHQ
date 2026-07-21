import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { CASE_STATUSES } from '@/lib/domain/legal-case';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

const CaseStatusSchema = z.enum(CASE_STATUSES);
const HEARING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface LegalCaseRow {
  id: string;
  tenant_id: string;
  title: string;
  case_number: string | null;
  country_code: string;
  court_pack_id: string | null;
  law_pack_id: string | null;
  procedure_pack_id: string | null;
  state_metadata: Record<string, unknown>;
  status: string;
  court: string | null;
  judge: string | null;
  stage: string | null;
  hearing_date: string | null;
  notes: string | null;
  matter_id: string | null;
  created_at: string;
  updated_at: string;
}

const CASE_COLUMNS = `id, tenant_id, title, case_number, country_code, court_pack_id, law_pack_id,
                      procedure_pack_id, state_metadata, status, court, judge, stage, hearing_date,
                      notes, matter_id, created_at, updated_at`;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UpdateCaseSchema = z
  .object({
    title: z.string().min(1).max(500),
    case_number: z.string().max(200).nullable(),
    country_code: z.string().length(2),
    court_pack_id: z.string().max(200).nullable(),
    law_pack_id: z.string().max(200).nullable(),
    procedure_pack_id: z.string().max(200).nullable(),
    state_metadata: z.record(z.string(), z.any()),
    status: CaseStatusSchema,
    court: z.string().max(300).nullable(),
    judge: z.string().max(300).nullable(),
    stage: z.string().max(300).nullable(),
    hearing_date: z.string().regex(HEARING_DATE_PATTERN, 'Expected YYYY-MM-DD').nullable(),
    notes: z.string().max(10000).nullable(),
    matter_id: z.string().regex(UUID_PATTERN, 'Invalid matter id').nullable(),
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
    // RLS scopes this to the caller's own tenant — a valid UUID belonging to
    // another tenant returns zero rows here, not a permission leak.
    const rows = await db.execute<LegalCaseRow>(
      session.tenantId,
      `SELECT ${CASE_COLUMNS}
       FROM "LegalCase"
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ case: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[CASES_API] GET /api/cases/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const result = UpdateCaseSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid update payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const fields = result.data;
    const db = new DatabaseClient();

    if (Object.prototype.hasOwnProperty.call(fields, 'matter_id') && fields.matter_id) {
      // A matter_id FK check bypasses RLS — re-verify ownership through an
      // RLS-scoped query before trusting it (same rule as POST /api/cases).
      const matterRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "Matter" WHERE id = $1`,
        [fields.matter_id]
      );
      if (matterRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'matter_id does not refer to an existing matter.' },
          { status: 400 }
        );
      }
    }

    // Any change to this Proceeding — not just matter_id — can alter what
    // its parent Matter's cached context renders (title/status/court/stage
    // all feed the proceedingsSource's rendered text), so the Matter this
    // case is linked to *before* the update also needs invalidating, not
    // just whatever it's linked to afterward.
    const beforeRows = await db.execute<{ matter_id: string | null }>(
      session.tenantId,
      `SELECT matter_id FROM "LegalCase" WHERE id = $1`,
      [id]
    );
    const previousMatterId = beforeRows[0]?.matter_id ?? null;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`"${key}" = $${paramIndex}`);
      values.push(value);
      paramIndex += 1;
    }
    setClauses.push(`"updated_at" = now()`);
    values.push(id);

    const rows = await db.execute<LegalCaseRow>(
      session.tenantId,
      `UPDATE "LegalCase"
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING ${CASE_COLUMNS}`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const matterIdsToInvalidate = Array.from(
      new Set([previousMatterId, rows[0].matter_id].filter((v): v is string => v !== null))
    );
    await Promise.all(
      matterIdsToInvalidate.map((matterId) => invalidateMatterContext(session.tenantId, matterId))
    );

    return NextResponse.json({ case: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[CASES_API] PATCH /api/cases/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const db = new DatabaseClient();

    // RLS scopes this to the caller's own tenant — a case belonging to
    // another tenant is indistinguishable from a nonexistent one, so a
    // cross-tenant id returns 404 here without ever running the dependent
    // check below.
    const caseRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "LegalCase" WHERE id = $1`,
      [id]
    );
    if (caseRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    // DocumentEnvelope.case_id is now RESTRICT, not CASCADE (Sprint 3, PR
    // 3A) — this endpoint checks explicitly up front rather than relying
    // on the resulting FK violation, so the caller gets a clear,
    // actionable response instead of a raw 500, matching the same
    // deterministic-409 pattern already used by matters/clients.
    // CourtNote.case_id is RESTRICT (no ON DELETE clause), same rule as
    // DocumentEnvelope.case_id (Sprint 3, PR 3A) — a Proceeding's hearing
    // history must never silently disappear via cascade, so this is
    // checked explicitly here too rather than relying on the resulting FK
    // violation.
    const [documentRows, courtNoteRows] = await Promise.all([
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "DocumentEnvelope" WHERE case_id = $1`,
        [id]
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "CourtNote" WHERE case_id = $1`,
        [id]
      ),
    ]);
    const linkedDocuments = documentRows[0].count;
    const linkedCourtNotes = courtNoteRows[0].count;
    if (linkedDocuments > 0) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          code: 'CASE_HAS_LINKED_DOCUMENTS',
          message: 'This case still has linked documents. Remove or relink them before deleting this case.',
          linked: { documents: linkedDocuments },
        },
        { status: 409 }
      );
    }
    if (linkedCourtNotes > 0) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          code: 'CASE_HAS_COURT_NOTES',
          message: 'This case has recorded Court Notes. Its hearing history must be preserved and cannot be deleted.',
          linked: { court_notes: linkedCourtNotes },
        },
        { status: 409 }
      );
    }

    let rows: { id: string; matter_id: string | null }[];
    try {
      rows = await db.execute<{ id: string; matter_id: string | null }>(
        session.tenantId,
        `DELETE FROM "LegalCase" WHERE id = $1 RETURNING id, matter_id`,
        [id]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('foreign key constraint')) {
        // Defense in depth against a document or Court Note linked in the
        // narrow window between the checks above and this delete — still a
        // deterministic 409, never a raw 500 leaking a Postgres error.
        return NextResponse.json(
          {
            error: 'CONFLICT',
            code: 'CASE_HAS_LINKED_DOCUMENTS',
            message: 'This case still has linked documents or Court Notes. Remove them before deleting this case.',
          },
          { status: 409 }
        );
      }
      throw error;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (rows[0].matter_id) {
      await invalidateMatterContext(session.tenantId, rows[0].matter_id);
    }
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    console.error('[CASES_API] DELETE /api/cases/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
