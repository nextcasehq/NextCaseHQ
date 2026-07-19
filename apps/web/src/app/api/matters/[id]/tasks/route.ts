import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Structured pending actions (Product Direction, Milestone 2 —
 * Hearing-Driven Matter Record Building). Read-only list. A MatterTask
 * has no text column of its own (see db/schema.sql) — its display text
 * is always the originating CourtNote's next_actions, joined here, never
 * copied.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MatterTaskRow {
  id: string;
  case_id: string;
  case_title: string;
  court_note_id: string;
  status: string;
  completed_at: string | null;
  action_text: string | null;
  hearing_date: string;
  court_forum_display: string;
  created_at: string;
}

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

    const rows = await db.execute<MatterTaskRow>(
      session.tenantId,
      `SELECT mt.id, mt.case_id, lc.title AS case_title, mt.court_note_id, mt.status, mt.completed_at,
              cn.next_actions AS action_text, cn.hearing_date, cn.court_forum_display, mt.created_at
       FROM "MatterTask" mt
       JOIN "CourtNote" cn ON cn.id = mt.court_note_id
       JOIN "LegalCase" lc ON lc.id = mt.case_id
       WHERE mt.matter_id = $1
       ORDER BY (mt.status = 'PENDING') DESC, mt.created_at DESC`,
      [id]
    );

    return NextResponse.json({ tasks: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_TASKS_API] GET /api/matters/[id]/tasks failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
