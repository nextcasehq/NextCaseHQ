import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { MATTER_TASK_STATUSES } from '@/lib/domain/matter-task';

/**
 * Marking a structured pending action done/dismissed (Product Direction,
 * Milestone 2). The only mutating endpoint this milestone introduces.
 * Never touches CourtNote — completing or dismissing a task changes only
 * MatterTask's own lifecycle columns, never the immutable record it was
 * derived from. The advocate must explicitly change status; it is never
 * inferred from a later Court Note (see the Milestone 2 plan, "stale or
 * superseded next actions").
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const StatusSchema = z.enum(MATTER_TASK_STATUSES);

const UpdateTaskSchema = z.object({
  status: StatusSchema,
});

interface MatterTaskRow {
  id: string;
  matter_id: string;
  case_id: string;
  court_note_id: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_COLUMNS = `id, matter_id, case_id, court_note_id, status, completed_at, completed_by, created_at, updated_at`;

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

type RouteParams = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, taskId } = await params;
    if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(taskId)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid matter or task id.' }, { status: 400 });
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

    const result = UpdateTaskSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid task update payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const db = new DatabaseClient();

    // RLS-scoped re-verification that this task belongs to this matter,
    // in this tenant, before updating — same FK-bypasses-RLS defense used
    // throughout the codebase.
    const existingRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "MatterTask" WHERE id = $1 AND matter_id = $2`,
      [taskId, id]
    );
    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const isCompleted = result.data.status === 'COMPLETED';
    const rows = await db.execute<MatterTaskRow>(
      session.tenantId,
      `UPDATE "MatterTask"
       SET status = $1,
           completed_at = CASE WHEN $2 THEN now() ELSE NULL END,
           completed_by = CASE WHEN $2 THEN $3::uuid ELSE NULL END,
           updated_at = now()
       WHERE id = $4 AND matter_id = $5
       RETURNING ${TASK_COLUMNS}`,
      [result.data.status, isCompleted, session.sub, taskId, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ task: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_TASKS_API] PATCH /api/matters/[id]/tasks/[taskId] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
