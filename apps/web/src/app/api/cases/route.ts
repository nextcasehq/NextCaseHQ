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
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json(
      { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
      { status: 401 }
    );
  }

  const db = new DatabaseClient();
  const rows = await db.execute<LegalCaseRow>(
    session.tenantId,
    `SELECT id, tenant_id, title, case_number, country_code, court_pack_id, law_pack_id,
            procedure_pack_id, state_metadata, created_at, updated_at
     FROM "LegalCase"
     ORDER BY created_at DESC
     LIMIT 100`,
    []
  );

  return NextResponse.json({ cases: rows }, { status: 200 });
}

export async function POST(request: NextRequest) {
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
}
