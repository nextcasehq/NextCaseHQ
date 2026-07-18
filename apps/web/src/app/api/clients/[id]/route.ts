import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const UpdateClientSchema = z
  .object({
    name: z.string().min(1).max(500),
    email: z.string().email().max(300).nullable(),
    phone: z.string().max(50).nullable(),
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
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid client id.' }, { status: 400 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const db = new DatabaseClient();
    const rows = await db.execute<ClientRow>(
      session.tenantId,
      `SELECT ${CLIENT_COLUMNS} FROM "Client" WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ client: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[CLIENTS_API] GET /api/clients/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid client id.' }, { status: 400 });
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

    const result = UpdateClientSchema.safeParse(body);
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
    values.push(id);

    const db = new DatabaseClient();
    const rows = await db.execute<ClientRow>(
      session.tenantId,
      `UPDATE "Client"
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING ${CLIENT_COLUMNS}`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ client: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[CLIENTS_API] PATCH /api/clients/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid client id.' }, { status: 400 });
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

    // RLS scopes this to the caller's own tenant — a client belonging to
    // another tenant is indistinguishable from a nonexistent one, so a
    // cross-tenant id returns 404 here without ever running the dependent
    // check below.
    const clientRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "Client" WHERE id = $1`,
      [id]
    );
    if (clientRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    // Matter.client_id has no ON DELETE action (RESTRICT), but this
    // endpoint checks explicitly up front rather than relying on the
    // resulting FK violation, so the caller gets a clear, actionable
    // response instead of a raw 500.
    const matterRows = await db.execute<{ count: number }>(
      session.tenantId,
      `SELECT COUNT(*)::int AS count FROM "Matter" WHERE client_id = $1`,
      [id]
    );
    const linkedMatters = matterRows[0].count;

    if (linkedMatters > 0) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          code: 'CLIENT_HAS_LINKED_MATTERS',
          message: 'This client still has linked matters. Remove or reassign those matters before deleting this client.',
          linked: { matters: linkedMatters },
        },
        { status: 409 }
      );
    }

    let rows: { id: string }[];
    try {
      rows = await db.execute<{ id: string }>(
        session.tenantId,
        `DELETE FROM "Client" WHERE id = $1 RETURNING id`,
        [id]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('foreign key constraint')) {
        // Defense in depth against a matter linked in the narrow window
        // between the check above and this delete — still a deterministic
        // 409, never a raw 500 leaking a Postgres error.
        return NextResponse.json(
          {
            error: 'CONFLICT',
            code: 'CLIENT_HAS_LINKED_MATTERS',
            message: 'This client still has linked matters. Remove or reassign those matters before deleting this client.',
          },
          { status: 409 }
        );
      }
      throw error;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    console.error('[CLIENTS_API] DELETE /api/clients/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
