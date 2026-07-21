import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { MATTER_TASK_STATUSES, MATTER_TASK_PRIORITIES } from '@/lib/domain/matter-task';

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
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const StatusSchema = z.enum(MATTER_TASK_STATUSES);
const PrioritySchema = z.enum(MATTER_TASK_PRIORITIES);

const UpdateTaskSchema = z
  .object({
    status: StatusSchema,
    title: z.string().min(1).max(300),
    description: z.string().max(5000).nullable(),
    priority: PrioritySchema,
    due_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable(),
    assigned_user_id: z.string().regex(UUID_PATTERN, 'Invalid user id').nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided.' });

interface MatterTaskRow {
  id: string;
  matter_id: string;
  case_id: string | null;
  court_note_id: string | null;
  status: string;
  priority: string;
  title: string | null;
  description: string | null;
  due_date: string | null;
  assigned_user_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_COLUMNS = `id, matter_id, case_id, court_note_id, status, priority, title, description,
                      due_date, assigned_user_id, completed_at, completed_by, created_at, updated_at`;

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

    if (result.data.assigned_user_id) {
      const userRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "User" WHERE id = $1 AND tenant_id = $2`,
        [result.data.assigned_user_id, session.tenantId]
      );
      if (userRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'assigned_user_id does not refer to a user in this tenant.' },
          { status: 400 }
        );
      }
    }

    const fields = result.data;
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`"${key}" = $${paramIndex}`);
      values.push(value);
      paramIndex += 1;
    }
    // Completing a task always stamps who/when; changing status away from
    // COMPLETED always clears both, matching the pre-existing behaviour this
    // route already had for the status-only case.
    if (Object.prototype.hasOwnProperty.call(fields, 'status')) {
      const isCompleted = fields.status === 'COMPLETED';
      setClauses.push(`"completed_at" = CASE WHEN $${paramIndex} THEN now() ELSE NULL END`);
      values.push(isCompleted);
      paramIndex += 1;
      setClauses.push(`"completed_by" = CASE WHEN $${paramIndex - 1} THEN $${paramIndex}::uuid ELSE NULL END`);
      values.push(session.sub);
      paramIndex += 1;
    }
    setClauses.push(`"updated_at" = now()`);
    values.push(taskId, id);

    const rows = await db.execute<MatterTaskRow>(
      session.tenantId,
      `UPDATE "MatterTask"
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND matter_id = $${paramIndex + 1}
       RETURNING ${TASK_COLUMNS}`,
      values
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
