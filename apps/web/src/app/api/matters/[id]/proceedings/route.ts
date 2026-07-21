import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { CASE_STATUSES } from '@/lib/domain/legal-case';
import { PROCEEDING_RELATIONSHIP_TYPES } from '@/lib/domain/proceeding-relationship';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Proceedings under a Matter Register — creates a LegalCase row scoped to
 * this matter_id. Doubles as "Create Further Proceeding" when
 * prior_proceeding_id/relationship_to_prior are supplied: closing or
 * superseding one proceeding never mutates it — the new stage of the
 * fight (appeal, execution, ...) is always a brand-new LegalCase row
 * preserving the link back to the one before it, so the full chain
 * (trial -> appeal -> revision -> execution) stays intact and sequenced.
 * set_as_current controls whether Matter.current_proceeding_id is
 * repointed at the newly created proceeding.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const CaseStatusSchema = z.enum(CASE_STATUSES);
const RelationshipSchema = z.enum(PROCEEDING_RELATIONSHIP_TYPES);

interface ProceedingRow {
  id: string;
  tenant_id: string;
  title: string;
  case_number: string | null;
  filing_number: string | null;
  cnr_number: string | null;
  country_code: string;
  status: string;
  court: string | null;
  judge: string | null;
  stage: string | null;
  hearing_date: string | null;
  proceeding_year: number | null;
  relationship_to_prior: string | null;
  prior_proceeding_id: string | null;
  start_date: string | null;
  end_date: string | null;
  matter_id: string | null;
  created_at: string;
  updated_at: string;
}

const PROCEEDING_COLUMNS = `id, tenant_id, title, case_number, filing_number, cnr_number, country_code,
                            status, court, judge, stage, hearing_date, proceeding_year,
                            relationship_to_prior, prior_proceeding_id, start_date, end_date, matter_id,
                            created_at, updated_at`;

const CreateProceedingSchema = z.object({
  title: z.string().min(1).max(500),
  case_number: z.string().max(200).nullable().optional(),
  filing_number: z.string().max(200).nullable().optional(),
  cnr_number: z.string().max(50).nullable().optional(),
  country_code: z.string().length(2).default('IN'),
  status: CaseStatusSchema.optional(),
  court: z.string().max(300).nullable().optional(),
  judge: z.string().max(300).nullable().optional(),
  stage: z.string().max(300).nullable().optional(),
  hearing_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable().optional(),
  proceeding_year: z.number().int().min(1900).max(2100).nullable().optional(),
  relationship_to_prior: RelationshipSchema.nullable().optional(),
  prior_proceeding_id: z.string().regex(UUID_PATTERN, 'Invalid proceeding id').nullable().optional(),
  start_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable().optional(),
  set_as_current: z.boolean().optional().default(true),
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

    const rows = await db.execute<ProceedingRow>(
      session.tenantId,
      `SELECT ${PROCEEDING_COLUMNS} FROM "LegalCase" WHERE matter_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({ proceedings: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_PROCEEDINGS_API] GET failed:', error);
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

    const result = CreateProceedingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid proceeding payload.', details: result.error.format() },
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
    // A closed Matter Register is read-only for every mutation type,
    // proceedings included — the only sanctioned way to add a further
    // proceeding after closure is to reopen the matter first via the
    // dedicated POST /api/matters/[id]/reopen flow, same as every other
    // route in this milestone.
    if (matterRows[0].status === 'CLOSED') {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          code: 'MATTER_CLOSED_READ_ONLY',
          message: 'This Matter Register is closed and read-only. Reopen it first via POST /api/matters/[id]/reopen.',
        },
        { status: 409 }
      );
    }

    if (input.prior_proceeding_id) {
      const priorRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "LegalCase" WHERE id = $1 AND matter_id = $2`,
        [input.prior_proceeding_id, id]
      );
      if (priorRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'prior_proceeding_id does not refer to a proceeding under this matter.' },
          { status: 400 }
        );
      }
    }
    if (input.relationship_to_prior && !input.prior_proceeding_id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'prior_proceeding_id is required when relationship_to_prior is set.' },
        { status: 400 }
      );
    }

    // Parameter order below is deliberately: $1 tenantId, $2 matterId (id),
    // $3 title, $4 case_number, $5 filing_number, $6 cnr_number,
    // $7 country_code, $8 status, $9 court, $10 judge, $11 stage,
    // $12 hearing_date, $13 proceeding_year, $14 relationship_to_prior,
    // $15 prior_proceeding_id, $16 start_date, $17 set_as_current,
    // $18 session.sub, $19 event description — every placeholder below is
    // annotated with which of these it refers to, since $2 (matterId) is
    // deliberately reused across three different clauses.
    const rows = await db.execute<ProceedingRow & { updated_matter_id: string }>(
      session.tenantId,
      `WITH inserted AS (
         INSERT INTO "LegalCase"
           (tenant_id, title, case_number, filing_number, cnr_number, country_code, status, court,
            judge, stage, hearing_date, proceeding_year, relationship_to_prior, prior_proceeding_id,
            start_date, matter_id)
         VALUES ($1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $2)
         RETURNING ${PROCEEDING_COLUMNS}
       ),
       matter_touch AS (
         UPDATE "Matter"
         SET current_proceeding_id = CASE WHEN $17 THEN (SELECT id FROM inserted) ELSE current_proceeding_id END,
             current_stage = CASE WHEN $17 THEN (SELECT stage FROM inserted) ELSE current_stage END,
             next_hearing_date = CASE WHEN $17 THEN (SELECT hearing_date FROM inserted)::date ELSE next_hearing_date END,
             updated_at = now(),
             updated_by_user_id = $18
         WHERE id = $2
         RETURNING id
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $2, CURRENT_DATE, $19, 'PROCEEDING_CREATED', $18
         RETURNING id
       )
       SELECT inserted.*, matter_touch.id AS updated_matter_id FROM inserted, matter_touch`,
      [
        session.tenantId, // $1
        id, // $2
        input.title, // $3
        input.case_number ?? null, // $4
        input.filing_number ?? null, // $5
        input.cnr_number ?? null, // $6
        input.country_code, // $7
        input.status ?? 'PENDING', // $8
        input.court ?? null, // $9
        input.judge ?? null, // $10
        input.stage ?? null, // $11
        input.hearing_date ?? null, // $12
        input.proceeding_year ?? null, // $13
        input.relationship_to_prior ?? null, // $14
        input.prior_proceeding_id ?? null, // $15
        input.start_date ?? null, // $16
        input.set_as_current, // $17
        session.sub, // $18
        `Proceeding created: ${input.title}${input.relationship_to_prior ? ` (${input.relationship_to_prior})` : ''}`, // $19
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Matter not found.' }, { status: 404 });
    }
    const { updated_matter_id: _updatedMatterId, ...proceeding } = rows[0];
    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ proceeding }, { status: 201 });
  } catch (error) {
    console.error('[MATTER_PROCEEDINGS_API] POST failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
