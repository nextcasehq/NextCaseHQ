import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = 'd9bb947f-21ca-49ac-aeb3-744ae02931b9';
const TENANT_B = '3ba02cdc-b9fd-4f39-acd6-280ce1bdfb92';
const USER_A = '26bcb050-61bd-4a03-86c3-d32bf093eb73';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId, email: 'matter-tasks-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/matters/placeholder/tasks'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/matters/[id]/tasks — structured pending actions (Milestone 2)', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Tasks Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matter Tasks Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'matter-tasks-author@nextcase.local']
    );
  });

  afterAll(async () => {
    await closePool();
  });

  async function createMatter(tenantId: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, 'Test Matter']
    );
    return rows[0].id;
  }

  async function createCase(tenantId: string, matterId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, title, 'IN', matterId]
    );
    return rows[0].id;
  }

  async function createCourtNoteWithTask(
    tenantId: string,
    caseId: string,
    matterId: string,
    nextActions: string,
    status: 'PENDING' | 'COMPLETED' | 'DISMISSED' = 'PENDING'
  ): Promise<string> {
    const noteRows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note, next_actions
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [tenantId, caseId, matterId, USER_A, '2026-01-10', 'HIGH_COURT', 'High Court', 'Arguments', 'Note', nextActions]
    );
    const noteId = noteRows[0].id;
    const taskRows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenantId, matterId, caseId, noteId, status]
    );
    return taskRows[0].id;
  }

  test('rejects with no session (401)', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await GET(buildRequest({}), routeParams(matterId));
    expect(res.status).toBe(401);
  });

  test('rejects an invalid (non-UUID) matter id with 400', async () => {
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('returns 404 for a well-formed but non-existent matter id', async () => {
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(NON_EXISTENT_ID));
    expect(res.status).toBe(404);
  });

  test('returns tasks with action text joined from the originating Court Note, pending first', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, 'Test Proceeding');
    await createCourtNoteWithTask(TENANT_A, caseId, matterId, 'Prepare rejoinder', 'COMPLETED');
    await createCourtNoteWithTask(TENANT_A, caseId, matterId, 'File exhibits', 'PENDING');

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toHaveLength(2);
    expect(body.tasks[0].status).toBe('PENDING');
    expect(body.tasks[0].action_text).toBe('File exhibits');
    expect(body.tasks[1].status).toBe('COMPLETED');
    expect(body.tasks[1].action_text).toBe('Prepare rejoinder');
  });

  test('tasks are not visible from another tenant session (RLS)', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, 'Test Proceeding');
    await createCourtNoteWithTask(TENANT_A, caseId, matterId, 'Prepare rejoinder');

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }), routeParams(matterId));
    expect(res.status).toBe(404);
  });

  describe('POST — standalone task creation (Production Matter Register Foundation)', () => {
    test('rejects POST with no session (401)', async () => {
      const matterId = await createMatter(TENANT_A);
      const res = await POST(buildRequest({}, 'POST', { title: 'Draft rejoinder' }), routeParams(matterId));
      expect(res.status).toBe(401);
    });

    test('rejects an untrusted origin (403)', async () => {
      const matterId = await createMatter(TENANT_A);
      const res = await POST(
        buildRequest({ cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }, 'POST', { title: 'Draft rejoinder' }),
        routeParams(matterId)
      );
      expect(res.status).toBe(403);
    });

    test('creates a standalone task with no Court Note at all — court_note_id and case_id are both null', async () => {
      const matterId = await createMatter(TENANT_A);
      const res = await POST(
        buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', {
          title: 'File vakalatnama',
          priority: 'HIGH',
          due_date: '2026-04-01',
        }),
        routeParams(matterId)
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.task.title).toBe('File vakalatnama');
      expect(body.task.priority).toBe('HIGH');
      expect(body.task.court_note_id).toBeNull();
      expect(body.task.case_id).toBeNull();
      expect(body.task.status).toBe('PENDING');
    });

    test('defaults priority to MEDIUM when not provided', async () => {
      const matterId = await createMatter(TENANT_A);
      const res = await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { title: 'Untitled task' }), routeParams(matterId));
      const body = await res.json();
      expect(body.task.priority).toBe('MEDIUM');
    });

    test('rejects a task with no title (400)', async () => {
      const matterId = await createMatter(TENANT_A);
      const res = await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', {}), routeParams(matterId));
      expect(res.status).toBe(400);
    });

    test('rejects a related_proceeding_id belonging to another matter', async () => {
      const matterId = await createMatter(TENANT_A);
      const otherMatterId = await createMatter(TENANT_A);
      const otherCaseId = await createCase(TENANT_A, otherMatterId, 'Unrelated Proceeding');
      const res = await POST(
        buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', {
          title: 'Cross-proceeding task',
          related_proceeding_id: otherCaseId,
        }),
        routeParams(matterId)
      );
      expect(res.status).toBe(400);
    });

    test('a standalone task and a Court-Note-derived task coexist in the same list, newest first among equal status', async () => {
      const matterId = await createMatter(TENANT_A);
      const caseId = await createCase(TENANT_A, matterId, 'Test Proceeding');
      await createCourtNoteWithTask(TENANT_A, caseId, matterId, 'Derived task text', 'PENDING');
      await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { title: 'Standalone task' }), routeParams(matterId));

      const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
      const body = await res.json();
      expect(body.tasks).toHaveLength(2);
      const titles = body.tasks.map((t: { title: string | null; action_text: string | null }) => t.title ?? t.action_text);
      expect(titles).toEqual(expect.arrayContaining(['Standalone task', 'Derived task text']));
    });

    test('rejects creating a task on a closed matter (409)', async () => {
      const matterId = await createMatter(TENANT_A);
      await db.execute(TENANT_A, `UPDATE "Matter" SET status = 'CLOSED' WHERE id = $1`, [matterId]);
      const res = await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { title: 'Should be blocked' }), routeParams(matterId));
      expect(res.status).toBe(409);
    });
  });
});
