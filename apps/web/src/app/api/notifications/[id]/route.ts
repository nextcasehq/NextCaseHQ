import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';

interface NotificationRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ id: string }> };

/** Marks a single notification as read. Only the addressed user (or any
 * user at the tenant, for a tenant-wide notification) can mark it read —
 * enforced by RLS via tenant_id, plus an explicit user_id check here since
 * RLS alone doesn't distinguish "addressed to a different user at the
 * same tenant" from "addressed to everyone." */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid notification id.' }, { status: 400 });
    }

    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    let session;
    try {
      session = await requireSession(request);
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        return NextResponse.json(
          { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
          { status: 401 }
        );
      }
      throw error;
    }

    const db = new DatabaseClient();
    const rows = await db.execute<NotificationRow>(
      session.tenantId,
      `UPDATE "Notification"
       SET read_at = now()
       WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) AND read_at IS NULL
       RETURNING id, tenant_id, user_id, type, title, message, read_at, created_at`,
      [id, session.sub]
    );

    if (rows.length === 0) {
      // Either it doesn't exist, isn't addressed to this user/tenant, or
      // was already read — indistinguishable from the outside, and none
      // of those cases warrant a different response.
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ notification: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[NOTIFICATIONS_API] PATCH /api/notifications/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
