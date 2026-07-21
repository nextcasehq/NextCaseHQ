import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Minimal Client CRUD — deliberately narrow per Milestone 1 scope (no
 * contacts, no company hierarchy, no CRM features). A Client exists only
 * to be optionally referenced by Matter.client_id.
 */

interface ClientRow {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

const CLIENT_COLUMNS = `id, tenant_id, name, email, phone, notes, created_at`;

const CreateClientSchema = z.object({
  name: z.string().min(1).max(500),
  email: z.string().email().max(300).optional(),
  phone: z.string().max(50).optional(),
  notes: z.string().max(10000).optional(),
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
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: queryResult.error.format() },
        { status: 400 }
      );
    }
    const { limit, offset } = queryResult.data;

    const db = new DatabaseClient();
    const [rows, countRows] = await Promise.all([
      db.execute<ClientRow>(
        session.tenantId,
        `SELECT ${CLIENT_COLUMNS}
         FROM "Client"
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.execute<{ count: number }>(session.tenantId, `SELECT COUNT(*)::int AS count FROM "Client"`, []),
    ]);

    return NextResponse.json(
      { clients: rows, total: countRows[0].count, limit, offset },
      { status: 200 }
    );
  } catch (error) {
    console.error('[CLIENTS_API] GET /api/clients failed:', error);
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

    const result = CreateClientSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid client payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();
    const rows = await db.execute<ClientRow>(
      session.tenantId,
      `INSERT INTO "Client" (tenant_id, name, email, phone, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${CLIENT_COLUMNS}`,
      [session.tenantId, input.name, input.email ?? null, input.phone ?? null, input.notes ?? null]
    );

    return NextResponse.json({ client: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[CLIENTS_API] POST /api/clients failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
