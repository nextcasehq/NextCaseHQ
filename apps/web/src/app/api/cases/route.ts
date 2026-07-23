import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { CASE_STATUSES } from '@/lib/domain/legal-case';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Real Case Management API — LegalCase persistence.
 *
 * Tenant identity comes ONLY from the verified session cookie (same rule
 * as /api/documents/upload), and every query runs through
 * DatabaseClient.execute(tenantId, ...), which binds
 * nextcase.current_tenant_id for Postgres RLS to enforce — so tenant
 * isolation holds even if a query here ever forgot a WHERE clause.
 */

const CaseStatusSchema = z.enum(CASE_STATUSES);
const HEARING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const CreateCaseSchema = z.object({
  title: z.string().min(1).max(500),
  case_number: z.string().max(200).optional(),
  country_code: z.string().length(2),
  court_pack_id: z.string().max(200).optional(),
  law_pack_id: z.string().max(200).optional(),
  procedure_pack_id: z.string().max(200).optional(),
  state_metadata: z.record(z.string(), z.any()).optional(),
  status: CaseStatusSchema.optional(),
  court: z.string().max(300).optional(),
  judge: z.string().max(300).optional(),
  stage: z.string().max(300).optional(),
  hearing_date: z.string().regex(HEARING_DATE_PATTERN, 'Expected YYYY-MM-DD').optional(),
  notes: z.string().max(10000).optional(),
  matter_id: z.string().regex(UUID_PATTERN, 'Invalid matter id').optional(),
});

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: CaseStatusSchema.optional(),
  matter_id: z.string().regex(UUID_PATTERN, 'Invalid matter id').optional(),
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

export async function GET(request: NextRequest) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const queryResult = ListQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
      status: request.nextUrl.searchParams.get('status') ?? undefined,
      matter_id: request.nextUrl.searchParams.get('matter_id') ?? undefined,
    });
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: queryResult.error.format() },
        { status: 400 }
      );
    }
    const { limit, offset, status, matter_id } = queryResult.data;

    const db = new DatabaseClient();
    const conditions: string[] = [];
    const countParams: unknown[] = [];
    if (status) {
      conditions.push(`lc.status = $${countParams.length + 1}`);
      countParams.push(status);
    }
    if (matter_id) {
      conditions.push(`lc.matter_id = $${countParams.length + 1}`);
      countParams.push(matter_id);
    }
    // The WHERE clause is identical for both queries — countParams' indices
    // line up with listParams' leading elements since listParams only
    // appends limit/offset after them.
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countFilter = whereClause;
    const statusFilter = whereClause;
    const listParams: unknown[] = [...countParams, limit, offset];
    const limitPlaceholder = `$${listParams.length - 1}`;
    const offsetPlaceholder = `$${listParams.length}`;

    // matter_title/client_name are read-only conveniences for the Case
    // Diary list to show which Matter (and client) a Proceeding belongs to
    // — a standalone Proceeding (matter_id null) simply gets null for both
    // rather than an error, same as every other nullable LEFT JOIN here.
    // latest_hearing_outcome (Case Diary "daily diary" restructuring) is
    // the most recent Court Note's structured outcome — used client-side to
    // bucket a Proceeding into Adjourned Hearings vs. Completed Hearings for
    // today; a Proceeding with no Court Notes yet simply gets null, same as
    // every other nullable LEFT JOIN LATERAL here.
    const [rows, countRows] = await Promise.all([
      db.execute<LegalCaseRow & { matter_title: string | null; client_name: string | null; latest_hearing_outcome: string | null }>(
        session.tenantId,
        `SELECT lc.id, lc.tenant_id, lc.title, lc.case_number, lc.country_code, lc.court_pack_id,
                lc.law_pack_id, lc.procedure_pack_id, lc.state_metadata, lc.status, lc.court, lc.judge,
                lc.stage, lc.hearing_date, lc.notes, lc.matter_id, lc.created_at, lc.updated_at,
                m.title AS matter_title, c.name AS client_name, latest_note.hearing_outcome AS latest_hearing_outcome
         FROM "LegalCase" lc
         LEFT JOIN "Matter" m ON m.id = lc.matter_id
         LEFT JOIN "Client" c ON c.id = m.client_id
         LEFT JOIN LATERAL (
           SELECT hearing_outcome FROM "CourtNote" WHERE case_id = lc.id ORDER BY created_at DESC LIMIT 1
         ) latest_note ON true
         ${statusFilter}
         ORDER BY lc.created_at DESC
         LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        listParams
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "LegalCase" lc ${countFilter}`,
        countParams
      ),
    ]);

    return NextResponse.json(
      { cases: rows, total: countRows[0].count, limit, offset },
      { status: 200 }
    );
  } catch (error) {
    console.error('[CASES_API] GET /api/cases failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const result = CreateCaseSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid case payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();

    // A matter_id FK check bypasses RLS, so a caller could otherwise link a
    // Proceeding to another tenant's Matter by guessing its UUID. Re-verify
    // ownership through an RLS-scoped query before trusting it.
    if (input.matter_id) {
      const matterRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "Matter" WHERE id = $1`,
        [input.matter_id]
      );
      if (matterRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'matter_id does not refer to an existing matter.' },
          { status: 400 }
        );
      }
    }

    const rows = await db.execute<LegalCaseRow>(
      session.tenantId,
      `INSERT INTO "LegalCase"
         (tenant_id, title, case_number, country_code, court_pack_id, law_pack_id, procedure_pack_id,
          state_metadata, status, court, judge, stage, hearing_date, notes, matter_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING ${CASE_COLUMNS}`,
      [
        session.tenantId,
        input.title,
        input.case_number ?? null,
        input.country_code,
        input.court_pack_id ?? null,
        input.law_pack_id ?? null,
        input.procedure_pack_id ?? null,
        input.state_metadata ?? {},
        input.status ?? 'PENDING',
        input.court ?? null,
        input.judge ?? null,
        input.stage ?? null,
        input.hearing_date ?? null,
        input.notes ?? null,
        input.matter_id ?? null,
      ]
    );

    if (input.matter_id) {
      await invalidateMatterContext(session.tenantId, input.matter_id);
    }
    return NextResponse.json({ case: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[CASES_API] POST /api/cases failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
