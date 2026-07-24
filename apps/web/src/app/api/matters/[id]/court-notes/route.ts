import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Matter-level Court Note aggregation (Product Direction, Milestone 2 —
 * Hearing-Driven Matter Record Building). Read-only: a Matter may have
 * several Proceedings, each with its own Court Note history; this is a
 * pure query across CourtNote.matter_id (already denormalized at insert
 * time in Milestone 1) joined to LegalCase for the originating
 * Proceeding's title — no Court Note content is copied anywhere.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MatterCourtNoteRow {
  id: string;
  case_id: string;
  case_title: string;
  hearing_date: string;
  next_hearing_date: string | null;
  court_forum_display: string;
  stage: string;
  hearing_outcome: string;
  note: string;
  next_actions: string | null;
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
    // RLS scopes this to the caller's own tenant — a matter belonging to
    // another tenant returns zero rows here, not a permission leak.
    const matterRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (matterRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const rows = await db.execute<MatterCourtNoteRow>(
      session.tenantId,
      `SELECT cn.id, cn.case_id, lc.title AS case_title, cn.hearing_date, cn.next_hearing_date,
              cn.court_forum_display, cn.stage, cn.hearing_outcome, cn.note, cn.next_actions, cn.created_at
       FROM "CourtNote" cn
       JOIN "LegalCase" lc ON lc.id = cn.case_id
       WHERE cn.matter_id = $1
       ORDER BY cn.hearing_date DESC, cn.created_at DESC`,
      [id]
    );

    return NextResponse.json({ court_notes: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_COURT_NOTES_API] GET /api/matters/[id]/court-notes failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
