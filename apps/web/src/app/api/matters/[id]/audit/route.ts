import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Read-only Matter audit trail (Production Matter Register Foundation).
 * MatterAuditEvent is append-only at the database-grant level (REVOKE
 * UPDATE, DELETE — see db/schema.sql) — there is no route anywhere in this
 * API that can edit or remove an audit event, only ever record new ones.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MatterAuditEventRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  previous_value: unknown;
  new_value: unknown;
  reason: string | null;
  created_at: string;
}

const AUDIT_COLUMNS = `id, tenant_id, matter_id, actor_user_id, action, target_type, target_id,
                       previous_value, new_value, reason, created_at`;

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

    const rows = await db.execute<MatterAuditEventRow>(
      session.tenantId,
      `SELECT ${AUDIT_COLUMNS} FROM "MatterAuditEvent" WHERE matter_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    return NextResponse.json({ audit_events: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_AUDIT_API] GET failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
