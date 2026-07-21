import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';
import { PREPARATION_WINDOW_DAYS } from '@/lib/domain/preparation';

/**
 * Seven-Day Case Preparation read view (Product Direction, Milestone 3).
 * Read-only and entirely derived, like Matter Health — nothing here is
 * persisted; a Proceeding simply qualifies whenever its hearing_date falls
 * within the next PREPARATION_WINDOW_DAYS days, independent of whether the
 * cron trigger (POST /api/cron/seven-day-preparation) has already sent a
 * Notification for it. Documents are listed exactly as they exist today —
 * no draft/final status is invented, per the approved Milestone 3 scope.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PendingActionRow {
  id: string;
  action_text: string | null;
}

interface DocumentRow {
  id: string;
  title: string;
}

interface PreparationItemRow {
  case_id: string;
  case_title: string;
  hearing_date: string;
  stage: string | null;
  court_forum_display: string | null;
  last_note: string | null;
  pending_actions: PendingActionRow[];
  documents: DocumentRow[];
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

    const rows = await db.execute<PreparationItemRow>(
      session.tenantId,
      `SELECT
         lc.id AS case_id,
         lc.title AS case_title,
         lc.hearing_date,
         latest.stage,
         latest.court_forum_display,
         latest.note AS last_note,
         COALESCE(pending.actions, '[]'::json) AS pending_actions,
         COALESCE(docs.items, '[]'::json) AS documents
       FROM "LegalCase" lc
       LEFT JOIN LATERAL (
         SELECT cn.stage, cn.court_forum_display, cn.note
         FROM "CourtNote" cn
         WHERE cn.case_id = lc.id
         ORDER BY cn.created_at DESC
         LIMIT 1
       ) latest ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('id', mt.id, 'action_text', src.next_actions) ORDER BY mt.created_at) AS actions
         FROM "MatterTask" mt
         JOIN "CourtNote" src ON src.id = mt.court_note_id
         WHERE mt.case_id = lc.id AND mt.status = 'PENDING'
       ) pending ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('id', de.id, 'title', de.title) ORDER BY de.created_at) AS items
         FROM "DocumentEnvelope" de
         WHERE de.case_id = lc.id
       ) docs ON true
       WHERE lc.matter_id = $1
         AND lc.hearing_date IS NOT NULL
         AND lc.hearing_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + $2::int)
       ORDER BY lc.hearing_date ASC`,
      [id, PREPARATION_WINDOW_DAYS]
    );

    return NextResponse.json({ preparation: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_PREPARATION_API] GET /api/matters/[id]/preparation failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
