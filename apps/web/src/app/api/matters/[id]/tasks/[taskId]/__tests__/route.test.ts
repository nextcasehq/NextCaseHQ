import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '4a2949b4-a9eb-4fee-ad17-8740bfc4114d';
const TENANT_B = '34967002-5c9c-4685-ae66-04aa9d7c4fcb';
const USER_A = 'd0cfcbd4-d1eb-48ae-a2ec-f0ae74c8d1d6';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId, email: 'matter-task-patch-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/matters/placeholder/tasks/placeholder'), {
    method: 'PATCH',
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string, taskId: string) {
  return { params: Promise.resolve({ id, taskId }) };
}

describe('PATCH /api/matters/[id]/tasks/[taskId] — mark a pending action done/dismissed (Milestone 2)', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Task Patch Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matter Task Patch Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'matter-task-patch-author@nextcase.local']
    );
  });

  afterAll(async () => {
    await closePool();
  });

  async function createTask(tenantId: string): Promise<{ matterId: string; taskId: string }> {
    const matterRows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, 'Test Matter']
    );
    const matterId = matterRows[0].id;
    const caseRows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, 'Test Proceeding', 'IN', matterId]
    );
    const caseId = caseRows[0].id;
    const noteRows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note, next_actions
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [tenantId, caseId, matterId, USER_A, '2026-01-10', 'HIGH_COURT', 'High Court', 'Arguments', 'Note', 'Do the thing']
    );
    const taskRows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, matterId, caseId, noteRows[0].id]
    );
    return { matterId, taskId: taskRows[0].id };
  }

  test('rejects with no session (401)', async () => {
    const { matterId, taskId } = await createTask(TENANT_A);
    const res = await PATCH(buildRequest({}, { status: 'COMPLETED' }), routeParams(matterId, taskId));
    expect(res.status).toBe(401);
  });

  test('rejects an untrusted origin (403)', async () => {
    const { matterId, taskId } = await createTask(TENANT_A);
    const res = await PATCH(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }, { status: 'COMPLETED' }),
      routeParams(matterId, taskId)
    );
    expect(res.status).toBe(403);
  });

  test('rejects an invalid status value (400)', async () => {
    const { matterId, taskId } = await createTask(TENANT_A);
    const res = await PATCH(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, { status: 'NOT_REAL' }),
      routeParams(matterId, taskId)
    );
    expect(res.status).toBe(400);
  });

  test('marks a task COMPLETED, setting completed_at/completed_by', async () => {
    const { matterId, taskId } = await createTask(TENANT_A);
    const res = await PATCH(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, { status: 'COMPLETED' }),
      routeParams(matterId, taskId)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.task.status).toBe('COMPLETED');
    expect(body.task.completed_at).not.toBeNull();
    expect(body.task.completed_by).toBe(USER_A);
  });

  test('reverting to PENDING clears completed_at/completed_by', async () => {
    const { matterId, taskId } = await createTask(TENANT_A);
    await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, { status: 'COMPLETED' }), routeParams(matterId, taskId));
    const res = await PATCH(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, { status: 'PENDING' }),
      routeParams(matterId, taskId)
    );
    const body = await res.json();
    expect(body.task.status).toBe('PENDING');
    expect(body.task.completed_at).toBeNull();
    expect(body.task.completed_by).toBeNull();
  });

  test('marking a task never alters its originating Court Note', async () => {
    const { matterId, taskId } = await createTask(TENANT_A);
    const taskRows = await db.execute<{ court_note_id: string }>(
      TENANT_A,
      `SELECT court_note_id FROM "MatterTask" WHERE id = $1`,
      [taskId]
    );
    const before = await db.execute<{ next_actions: string; updated_at: string }>(
      TENANT_A,
      `SELECT next_actions FROM "CourtNote" WHERE id = $1`,
      [taskRows[0].court_note_id]
    );

    await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, { status: 'DISMISSED' }), routeParams(matterId, taskId));

    const after = await db.execute<{ next_actions: string }>(
      TENANT_A,
      `SELECT next_actions FROM "CourtNote" WHERE id = $1`,
      [taskRows[0].court_note_id]
    );
    expect(after[0].next_actions).toBe(before[0].next_actions);
  });

  test('returns 404 when the task belongs to another tenant (RLS)', async () => {
    const { matterId, taskId } = await createTask(TENANT_A);
    const res = await PATCH(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }, { status: 'COMPLETED' }),
      routeParams(matterId, taskId)
    );
    expect(res.status).toBe(404);
  });

  test('returns 404 for a well-formed but non-existent task id', async () => {
    const { matterId } = await createTask(TENANT_A);
    const res = await PATCH(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, { status: 'COMPLETED' }),
      routeParams(matterId, NON_EXISTENT_ID)
    );
    expect(res.status).toBe(404);
  });
});
