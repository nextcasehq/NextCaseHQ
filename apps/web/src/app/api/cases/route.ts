import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Real Case Management API — LegalCase persistence.
 *
 * Tenant identity comes ONLY from the verified session cookie (same rule
 * as /api/documents/upload), and every query runs through
 * DatabaseClient.execute(tenantId, ...), which binds
 * nextcase.current_tenant_id for Postgres RLS to enforce — so tenant
 * isolation holds even if a query here ever forgot a WHERE clause.
 */

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
  created_at: string;
  updated_at: string;
}

const CreateCaseSchema = z.object({
  title: z.string().min(1).max(500),
  case_number: z.string().max(200).optional(),
  country_code: z.string().length(2),
  court_pack_id: z.string().max(200).optional(),
  law_pack_id: z.string().max(200).optional(),
  procedure_pack_id: z.string().max(200).optional(),
  state_metadata: z.record(z.string(), z.any()).optional(),
});

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
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
    });
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid pagination parameters.', details: queryResult.error.format() },
        { status: 400 }
      );
    }
    const { limit, offset } = queryResult.data;

    const db = new DatabaseClient();
    const [rows, countRows] = await Promise.all([
      db.execute<LegalCaseRow>(
        session.tenantId,
        `SELECT id, tenant_id, title, case_number, country_code, court_pack_id, law_pack_id,
                procedure_pack_id, state_metadata, created_at, updated_at
         FROM "LegalCase"
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.execute<{ count: number }>(session.tenantId, `SELECT COUNT(*)::int AS count FROM "LegalCase"`, []),
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
    const rows = await db.execute<LegalCaseRow>(
      session.tenantId,
      `INSERT INTO "LegalCase"
         (tenant_id, title, case_number, country_code, court_pack_id, law_pack_id, procedure_pack_id, state_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, title, case_number, country_code, court_pack_id, law_pack_id,
                 procedure_pack_id, state_metadata, created_at, updated_at`,
      [
        session.tenantId,
        input.title,
        input.case_number ?? null,
        input.country_code,
        input.court_pack_id ?? null,
        input.law_pack_id ?? null,
        input.procedure_pack_id ?? null,
        input.state_metadata ?? {},
      ]
    );

    return NextResponse.json({ case: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[CASES_API] POST /api/cases failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
