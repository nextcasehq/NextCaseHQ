import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
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

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
  unread_only: z.coerce.boolean().optional().default(false),
});

/**
 * Real in-app notifications, replacing the dashboard bell's previously
 * hardcoded mock list. Returns notifications addressed to the calling
 * user specifically, plus tenant-wide ones (user_id IS NULL) — e.g. a
 * future billing event notifying every user at a tenant.
 */
export async function GET(request: NextRequest) {
  try {
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

    const parsed = ListQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
      unread_only: request.nextUrl.searchParams.get('unread_only') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { limit, offset, unread_only } = parsed.data;

    const unreadFilter = unread_only ? `AND read_at IS NULL` : '';

    const db = new DatabaseClient();
    const [rows, countRows, unreadCountRows] = await Promise.all([
      db.execute<NotificationRow>(
        session.tenantId,
        `SELECT id, tenant_id, user_id, type, title, message, read_at, created_at
         FROM "Notification"
         WHERE (user_id = $3 OR user_id IS NULL) ${unreadFilter}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset, session.sub]
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "Notification" WHERE (user_id = $1 OR user_id IS NULL) ${unreadFilter}`,
        [session.sub]
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "Notification" WHERE (user_id = $1 OR user_id IS NULL) AND read_at IS NULL`,
        [session.sub]
      ),
    ]);

    return NextResponse.json(
      {
        notifications: rows,
        total: countRows[0].count,
        unread_count: unreadCountRows[0].count,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[NOTIFICATIONS_API] GET /api/notifications failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
