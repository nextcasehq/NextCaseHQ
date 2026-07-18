import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { CASE_STATUSES } from '@/lib/domain/legal-case';

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
  created_at: string;
  updated_at: string;
}

const CASE_COLUMNS = `id, tenant_id, title, case_number, country_code, court_pack_id, law_pack_id,
                      procedure_pack_id, state_metadata, status, court, judge, stage, hearing_date,
                      notes, created_at, updated_at`;

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

    const db = new DatabaseClient();
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
    const rows = await db.execute<{ id: string }>(
      session.tenantId,
      `DELETE FROM "LegalCase" WHERE id = $1 RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    console.error('[CASES_API] DELETE /api/cases/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
