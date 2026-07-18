import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { MATTER_STATUSES, MATTER_ENGAGEMENT_TYPES } from '@/lib/domain/matter';

/**
 * Real Matter Workspace API — the parent client engagement / "digital case
 * room". A Matter may exist with zero Proceedings (LegalCase rows) — see
 * db/schema.sql section 3b for the approved Matter/Proceeding architecture.
 *
 * Tenant identity comes ONLY from the verified session cookie (same rule
 * as /api/cases), and every query runs through
 * DatabaseClient.execute(tenantId, ...), which binds
 * nextcase.current_tenant_id for Postgres RLS to enforce.
 */

const MatterStatusSchema = z.enum(MATTER_STATUSES);
const MatterEngagementTypeSchema = z.enum(MATTER_ENGAGEMENT_TYPES);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
}

const MATTER_COLUMNS = `m.id, m.tenant_id, m.title, m.matter_number, m.engagement_type, m.practice_area,
                        m.status, m.client_id, m.opposing_party_name, m.opposing_counsel, m.court,
                        m.bench, m.judge, m.description, m.opened_at, m.closed_at, m.created_at,
                        m.updated_at, c.name AS client_name`;
const MATTER_FROM = `"Matter" m LEFT JOIN "Client" c ON c.id = m.client_id`;

const CreateMatterSchema = z.object({
  title: z.string().min(1).max(500),
  matter_number: z.string().max(200).optional(),
  engagement_type: MatterEngagementTypeSchema.optional(),
  practice_area: z.string().max(300).optional(),
  status: MatterStatusSchema.optional(),
  client_id: z.string().regex(UUID_PATTERN, 'Invalid client id').optional(),
  opposing_party_name: z.string().max(300).optional(),
  opposing_counsel: z.string().max(300).optional(),
  court: z.string().max(300).optional(),
  bench: z.string().max(300).optional(),
  judge: z.string().max(300).optional(),
  description: z.string().max(10000).optional(),
});

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: MatterStatusSchema.optional(),
  engagement_type: MatterEngagementTypeSchema.optional(),
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
      engagement_type: request.nextUrl.searchParams.get('engagement_type') ?? undefined,
    });
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: queryResult.error.format() },
        { status: 400 }
      );
    }
    const { limit, offset, status, engagement_type } = queryResult.data;

    const db = new DatabaseClient();
    const conditions: string[] = [];
    const listParams: unknown[] = [];
    if (status) {
      conditions.push(`m.status = $${listParams.length + 1}`);
      listParams.push(status);
    }
    if (engagement_type) {
      conditions.push(`m.engagement_type = $${listParams.length + 1}`);
      listParams.push(engagement_type);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countParams = [...listParams];
    listParams.push(limit, offset);
    const limitPlaceholder = `$${listParams.length - 1}`;
    const offsetPlaceholder = `$${listParams.length}`;

    const [rows, countRows] = await Promise.all([
      db.execute<MatterRow>(
        session.tenantId,
        `SELECT ${MATTER_COLUMNS}
         FROM ${MATTER_FROM}
         ${whereClause}
         ORDER BY m.created_at DESC
         LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        listParams
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "Matter" m ${whereClause}`,
        countParams
      ),
    ]);

    return NextResponse.json(
      { matters: rows, total: countRows[0].count, limit, offset },
      { status: 200 }
    );
  } catch (error) {
    console.error('[MATTERS_API] GET /api/matters failed:', error);
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

    const result = CreateMatterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid matter payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();

    // A client_id FK check bypasses RLS, so a caller could otherwise link a
    // Matter to another tenant's Client row by guessing its UUID. Re-verify
    // ownership through an RLS-scoped query before trusting it.
    if (input.client_id) {
      const clientRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "Client" WHERE id = $1`,
        [input.client_id]
      );
      if (clientRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'client_id does not refer to an existing client.' },
          { status: 400 }
        );
      }
    }

    const rows = await db.execute<MatterRow>(
      session.tenantId,
      `WITH inserted AS (
         INSERT INTO "Matter"
           (tenant_id, title, matter_number, engagement_type, practice_area, status, client_id,
            opposing_party_name, opposing_counsel, court, bench, judge, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, tenant_id, title, matter_number, engagement_type, practice_area, status,
                   client_id, opposing_party_name, opposing_counsel, court, bench, judge,
                   description, opened_at, closed_at, created_at, updated_at
       )
       SELECT ${MATTER_COLUMNS} FROM inserted m LEFT JOIN "Client" c ON c.id = m.client_id`,
      [
        session.tenantId,
        input.title,
        input.matter_number ?? null,
        input.engagement_type ?? 'LITIGATION',
        input.practice_area ?? null,
        input.status ?? 'ACTIVE',
        input.client_id ?? null,
        input.opposing_party_name ?? null,
        input.opposing_counsel ?? null,
        input.court ?? null,
        input.bench ?? null,
        input.judge ?? null,
        input.description ?? null,
      ]
    );

    return NextResponse.json({ matter: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[MATTERS_API] POST /api/matters failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
