import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Matter Health summary (Product Direction, Milestone 2 — Hearing-Driven
 * Matter Record Building). Everything here is derived live, on every
 * read, from existing rows (CourtNote, LegalCase, MatterTask) — nothing
 * is persisted as new Matter columns, so there is no "recompute" step to
 * forget and no risk of a stale snapshot. Kept as its own endpoint
 * (rather than folded into GET /api/matters/[id]) so the existing,
 * already-tested Matter response shape is untouched.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MatterHealthRow {
  stage: string | null;
  last_hearing_date: string | null;
  last_court_forum_display: string | null;
  last_note: string | null;
  last_case_title: string | null;
  next_hearing_date: string | null;
  pending_action_count: number;
  needs_attention: boolean;
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

    const rows = await db.execute<MatterHealthRow>(
      session.tenantId,
      `WITH latest_note AS (
         SELECT cn.stage, cn.hearing_date, cn.court_forum_display, cn.note, lc.title AS case_title
         FROM "CourtNote" cn
         JOIN "LegalCase" lc ON lc.id = cn.case_id
         WHERE cn.matter_id = $1
         ORDER BY cn.hearing_date DESC, cn.created_at DESC
         LIMIT 1
       ),
       next_hearing AS (
         SELECT MIN(hearing_date) AS next_hearing_date
         FROM "LegalCase"
         WHERE matter_id = $1 AND hearing_date IS NOT NULL
       ),
       pending_count AS (
         SELECT COUNT(*)::int AS count FROM "MatterTask" WHERE matter_id = $1 AND status = 'PENDING'
       ),
       attention AS (
         SELECT EXISTS (
           SELECT 1 FROM "LegalCase" WHERE matter_id = $1 AND status <> 'DISPOSED' AND hearing_date IS NULL
         ) AS needs_attention
       )
       SELECT
         (SELECT stage FROM latest_note) AS stage,
         (SELECT hearing_date FROM latest_note) AS last_hearing_date,
         (SELECT court_forum_display FROM latest_note) AS last_court_forum_display,
         (SELECT note FROM latest_note) AS last_note,
         (SELECT case_title FROM latest_note) AS last_case_title,
         (SELECT next_hearing_date FROM next_hearing) AS next_hearing_date,
         (SELECT count FROM pending_count) AS pending_action_count,
         (SELECT needs_attention FROM attention) AS needs_attention`,
      [id]
    );

    return NextResponse.json({ health: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_HEALTH_API] GET /api/matters/[id]/health failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
