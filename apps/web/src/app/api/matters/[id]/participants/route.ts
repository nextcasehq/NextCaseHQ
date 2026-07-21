import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Matter team assignment — a record of who is assigned to a Matter, with a
 * role label. This milestone stores the assignment only; it does not
 * enforce any access control based on role or membership (see
 * db/schema.sql section 3b) — tenant-wide RLS remains the only real
 * boundary until a future granular-permissions milestone.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARTICIPANT_ROLES = ['LEAD', 'ASSOCIATE', 'CLERK', 'VIEWER'] as const;
const ParticipantRoleSchema = z.enum(PARTICIPANT_ROLES);

interface MatterParticipantRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email: string;
  user_name: string | null;
}

const PARTICIPANT_COLUMNS = `mp.id, mp.tenant_id, mp.matter_id, mp.user_id, mp.role, mp.created_at,
                             u.email AS user_email, u.name AS user_name`;

const CreateParticipantSchema = z.object({
  user_id: z.string().regex(UUID_PATTERN, 'Invalid user id'),
  role: ParticipantRoleSchema.optional(),
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
    const rows = await db.execute<MatterParticipantRow>(
      session.tenantId,
      `SELECT ${PARTICIPANT_COLUMNS}
       FROM "MatterParticipant" mp
       JOIN "User" u ON u.id = mp.user_id
       WHERE mp.matter_id = $1
       ORDER BY mp.created_at ASC`,
      [id]
    );

    return NextResponse.json({ participants: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTERS_API] GET /api/matters/[id]/participants failed:', error);
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

    const result = CreateParticipantSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid participant payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();

    // Both matter_id and user_id FK checks bypass RLS. "User" itself carries
    // no RLS policy (pre-existing, out of this milestone's scope), so the
    // tenant_id filter below is the only thing standing between this insert
    // and cross-tenant linkage — verify explicitly rather than trust the FK.
    const matterRows = await db.execute<{ id: string; status: string }>(
      session.tenantId,
      `SELECT id, status FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (matterRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Matter not found.' }, { status: 404 });
    }
    if (matterRows[0].status === 'CLOSED') {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          code: 'MATTER_CLOSED_READ_ONLY',
          message: 'This matter is closed and cannot accept new team assignments.',
        },
        { status: 409 }
      );
    }

    const userRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "User" WHERE id = $1 AND tenant_id = $2`,
      [input.user_id, session.tenantId]
    );
    if (userRows.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'user_id does not refer to a user in this tenant.' },
        { status: 400 }
      );
    }

    let rows: MatterParticipantRow[];
    try {
      rows = await db.execute<MatterParticipantRow>(
        session.tenantId,
        `WITH inserted AS (
           INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role)
           VALUES ($1, $2, $3, $4)
           RETURNING id, tenant_id, matter_id, user_id, role, created_at
         )
         SELECT ${PARTICIPANT_COLUMNS}
         FROM inserted mp
         JOIN "User" u ON u.id = mp.user_id`,
        [session.tenantId, id, input.user_id, input.role ?? 'ASSOCIATE']
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('duplicate key') || message.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'CONFLICT', message: 'This user is already assigned to this matter.' },
          { status: 409 }
        );
      }
      throw error;
    }

    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ participant: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[MATTERS_API] POST /api/matters/[id]/participants failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
