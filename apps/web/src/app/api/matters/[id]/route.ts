import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { MATTER_STATUSES, MATTER_ENGAGEMENT_TYPES } from '@/lib/domain/matter';

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
    values.push(id);

    const rows = await db.execute<MatterRow>(
      session.tenantId,
      `WITH updated AS (
         UPDATE "Matter"
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, tenant_id, title, matter_number, engagement_type, practice_area, status,
                   client_id, opposing_party_name, opposing_counsel, court, bench, judge,
                   description, opened_at, closed_at, created_at, updated_at
       )
       SELECT ${MATTER_COLUMNS} FROM updated m LEFT JOIN "Client" c ON c.id = m.client_id`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
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
    const rows = await db.execute<{ id: string }>(
      session.tenantId,
      `DELETE FROM "Matter" WHERE id = $1 RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    console.error('[MATTERS_API] DELETE /api/matters/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
