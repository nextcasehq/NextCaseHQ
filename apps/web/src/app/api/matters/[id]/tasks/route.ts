import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { MATTER_TASK_PRIORITIES } from '@/lib/domain/matter-task';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Structured pending actions (Product Direction, Milestone 2 —
 * Hearing-Driven Matter Record Building — extended by the Production
 * Matter Register Foundation). GET lists both Court-Note-derived tasks
 * (whose display text is always the originating CourtNote's next_actions,
 * never copied) and standalone tasks created directly via POST here (whose
 * own title/description columns are the display text — see
 * db/schema.sql section 9f).
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PrioritySchema = z.enum(MATTER_TASK_PRIORITIES);

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).nullable().optional(),
  priority: PrioritySchema.optional().default('MEDIUM'),
  due_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable().optional(),
  assigned_user_id: z.string().regex(UUID_PATTERN, 'Invalid user id').nullable().optional(),
  related_proceeding_id: z.string().regex(UUID_PATTERN, 'Invalid proceeding id').nullable().optional(),
});

interface MatterTaskRow {
  id: string;
  case_id: string | null;
  case_title: string | null;
  court_note_id: string | null;
  status: string;
  priority: string;
  title: string | null;
  description: string | null;
  due_date: string | null;
  assigned_user_id: string | null;
  related_hearing_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  action_text: string | null;
  hearing_date: string | null;
  court_forum_display: string | null;
  created_by: string | null;
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
      `SELECT mt.id, mt.case_id, lc.title AS case_title, mt.court_note_id, mt.status, mt.priority,
              mt.title, mt.description, mt.due_date, mt.assigned_user_id, mt.related_hearing_id,
              mt.completed_at, mt.completed_by, cn.next_actions AS action_text, cn.hearing_date,
              cn.court_forum_display, mt.created_by, mt.created_at
       FROM "MatterTask" mt
       LEFT JOIN "CourtNote" cn ON cn.id = mt.court_note_id
       LEFT JOIN "LegalCase" lc ON lc.id = mt.case_id
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

    const result = CreateTaskSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid task payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();

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
        { error: 'CONFLICT', code: 'MATTER_CLOSED_READ_ONLY', message: 'This Matter Register is closed and read-only.' },
        { status: 409 }
      );
    }

    if (input.related_proceeding_id) {
      const proceedingRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "LegalCase" WHERE id = $1 AND matter_id = $2`,
        [input.related_proceeding_id, id]
      );
      if (proceedingRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'related_proceeding_id does not refer to a proceeding under this matter.' },
          { status: 400 }
        );
      }
    }
    if (input.assigned_user_id) {
      const userRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "User" WHERE id = $1 AND tenant_id = $2`,
        [input.assigned_user_id, session.tenantId]
      );
      if (userRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'assigned_user_id does not refer to a user in this tenant.' },
          { status: 400 }
        );
      }
    }

    const rows = await db.execute<MatterTaskRow>(
      session.tenantId,
      `WITH inserted AS (
         INSERT INTO "MatterTask"
           (tenant_id, matter_id, case_id, title, description, priority, due_date, assigned_user_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, case_id, court_note_id, status, priority, title, description, due_date,
                   assigned_user_id, related_hearing_id, completed_at, completed_by, created_by, created_at
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $2, CURRENT_DATE, $10, 'TASK_CREATED', $9
         RETURNING id
       )
       SELECT inserted.*, NULL::text AS case_title, NULL::text AS action_text,
              NULL::text AS hearing_date, NULL::text AS court_forum_display
       FROM inserted`,
      [
        session.tenantId,
        id,
        input.related_proceeding_id ?? null,
        input.title,
        input.description ?? null,
        input.priority,
        input.due_date ?? null,
        input.assigned_user_id ?? null,
        session.sub,
        `Task created: ${input.title}`,
      ]
    );

    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ task: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[MATTER_TASKS_API] POST /api/matters/[id]/tasks failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
