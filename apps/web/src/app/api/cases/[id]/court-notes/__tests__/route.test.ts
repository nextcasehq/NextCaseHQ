import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '26d78714-6af1-451b-84ae-c169a64cf08a';
const TENANT_B = '2dbe41f0-fbd9-424f-8836-a970447092cb';
const USER_ID = 'd2b8aa80-42d1-4efb-98bb-18989f765cf4';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'court-notes-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/cases/placeholder/court-notes'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const VALID_PAYLOAD = {
  hearing_date: '2026-02-01',
  next_hearing_date: '2026-03-15',
  court_forum_type: 'HIGH_COURT',
  stage: 'Arguments',
  note: 'Matter argued in part; adjourned for continuation.',
  next_actions: 'Prepare rejoinder written submissions.',
};

describe('GET/POST /api/cases/[id]/court-notes — Court Note Quick Entry Foundation', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Court Notes Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Court Notes Test Tenant B',
    ]);
    // CourtNote.author_user_id is a real FK to "User" — unlike MatterEvent,
    // it must reference a row that actually exists.
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'court-notes-author@nextcase.local']
    );
  });

  // CourtNote is append-only — nextcase_app has no UPDATE/DELETE grant on it
  // (see db/schema.sql) — and CourtNote.case_id is RESTRICT, so a LegalCase
  // row that ever gained a Court Note can't be cleaned up either. Like
  // DocumentAccessEvent's tests (lib/documents/__tests__/access-audit.test.ts),
  // this suite never attempts to delete rows it creates: every test uses a
  // fresh, uniquely generated case/matter id and scopes its assertions (or
  // uses before/after count deltas) so leftover rows from earlier runs or
  // other tests can never affect the result.
  afterAll(async () => {
    await closePool();
  });

  async function createCase(tenantId: string, matterId?: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, 'Test Proceeding', 'IN', matterId ?? null]
    );
    return rows[0].id;
  }

  async function createMatter(tenantId: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, 'Test Matter']
    );
    return rows[0].id;
  }

  test('POST rejects with no session (401)', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(buildRequest('POST', {}, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(401);
  });

  test('POST rejects an untrusted origin (403)', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }, VALID_PAYLOAD),
      routeParams(caseId)
    );
    expect(res.status).toBe(403);
  });

  test('POST rejects a malformed hearing_date (400)', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { ...VALID_PAYLOAD, hearing_date: 'not-a-date' }),
      routeParams(caseId)
    );
    expect(res.status).toBe(400);
  });

  test('POST rejects OTHER forum with no court_forum_other (400)', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { ...VALID_PAYLOAD, court_forum_type: 'OTHER' }),
      routeParams(caseId)
    );
    expect(res.status).toBe(400);
  });

  test('POST returns 404 when the case belongs to another tenant (FK-bypasses-RLS re-verification)', async () => {
    const caseId = await createCase(TENANT_B);
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD),
      routeParams(caseId)
    );
    expect(res.status).toBe(404);
  });

  test('POST creates a Court Note, resolves OTHER forum display, and updates the Proceeding', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { ...VALID_PAYLOAD, court_forum_type: 'OTHER', court_forum_other: 'Tahsildar Court, Bengaluru' }
      ),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.court_note.court_forum_type).toBe('OTHER');
    expect(body.court_note.court_forum_other).toBe('Tahsildar Court, Bengaluru');
    expect(body.court_note.court_forum_display).toBe('Tahsildar Court, Bengaluru');
    expect(body.court_note.input_method).toBe('MANUAL');

    const caseRows = await db.execute<{ hearing_date: string; stage: string; court: string }>(
      TENANT_A,
      `SELECT hearing_date, stage, court FROM "LegalCase" WHERE id = $1`,
      [caseId]
    );
    expect(caseRows[0]).toMatchObject({
      hearing_date: '2026-03-15',
      stage: 'Arguments',
      court: 'Tahsildar Court, Bengaluru',
    });
  });

  async function tenantEventCount(): Promise<number> {
    const rows = await db.execute<{ count: number }>(
      TENANT_A,
      `SELECT COUNT(*)::int AS count FROM "MatterEvent" WHERE tenant_id = $1`,
      [TENANT_A]
    );
    return rows[0].count;
  }

  test('POST on a Proceeding with no Matter creates no MatterEvent row', async () => {
    const caseId = await createCase(TENANT_A);
    const before = await tenantEventCount();
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);
    expect(await tenantEventCount()).toBe(before);
  });

  test('POST on a matter-linked Proceeding auto-builds the Matter timeline (zero duplicate entry)', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    const before = await tenantEventCount();
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);
    expect(await tenantEventCount()).toBe(before + 1);

    const events = await db.execute<{ matter_id: string; event_date: string; source_type: string; description: string }>(
      TENANT_A,
      `SELECT matter_id, event_date::text, source_type, description FROM "MatterEvent" WHERE matter_id = $1`,
      [matterId]
    );
    expect(events).toHaveLength(1);
    expect(events[0].source_type).toBe('HEARING');
    expect(events[0].event_date).toBe('2026-02-01');
    expect(events[0].description).toContain('Arguments');
    expect(events[0].description).toContain('Next: Prepare rejoinder written submissions.');
  });

  test('POST on a matter-linked Proceeding with next_actions creates exactly one MatterTask (Milestone 2)', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);
    const body = await res.json();

    const tasks = await db.execute<{ matter_id: string; case_id: string; court_note_id: string; status: string }>(
      TENANT_A,
      `SELECT matter_id, case_id, court_note_id, status FROM "MatterTask" WHERE matter_id = $1`,
      [matterId]
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].case_id).toBe(caseId);
    expect(tasks[0].court_note_id).toBe(body.court_note.id);
    expect(tasks[0].status).toBe('PENDING');
  });

  test('POST with no next_actions creates no MatterTask, even when matter-linked', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    const { next_actions: _omit, ...payloadWithoutNextActions } = VALID_PAYLOAD as typeof VALID_PAYLOAD & { next_actions?: string };
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, payloadWithoutNextActions),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);

    const tasks = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "MatterTask" WHERE matter_id = $1`, [matterId]);
    expect(tasks).toHaveLength(0);
  });

  test('POST on a Proceeding with no Matter creates no MatterTask, even with next_actions', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);
    const body = await res.json();

    const tasks = await db.execute<{ id: string }>(
      TENANT_A,
      `SELECT id FROM "MatterTask" WHERE court_note_id = $1`,
      [body.court_note.id]
    );
    expect(tasks).toHaveLength(0);
  });

  test('two Court Notes on the same Proceeding each with next_actions produce two separate MatterTask rows, never merged', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { ...VALID_PAYLOAD, hearing_date: '2026-03-15', next_actions: 'File exhibits.' }
      ),
      routeParams(caseId)
    );

    const tasks = await db.execute<{ court_note_id: string }>(
      TENANT_A,
      `SELECT court_note_id FROM "MatterTask" WHERE matter_id = $1`,
      [matterId]
    );
    expect(tasks).toHaveLength(2);
    expect(new Set(tasks.map((t) => t.court_note_id)).size).toBe(2);
  });

  test('two sequential Court Notes both persist unchanged; the Proceeding reflects only the latest', async () => {
    const caseId = await createCase(TENANT_A);
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { ...VALID_PAYLOAD, hearing_date: '2026-03-15', next_hearing_date: '2026-04-20', stage: 'Final Hearing', note: 'Order reserved.' }
      ),
      routeParams(caseId)
    );

    const listRes = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(caseId));
    const listBody = await listRes.json();
    expect(listBody.court_notes).toHaveLength(2);
    expect(listBody.court_notes[0].stage).toBe('Final Hearing');
    expect(listBody.court_notes[1].stage).toBe('Arguments');

    const caseRows = await db.execute<{ hearing_date: string; stage: string }>(
      TENANT_A,
      `SELECT hearing_date, stage FROM "LegalCase" WHERE id = $1`,
      [caseId]
    );
    expect(caseRows[0]).toMatchObject({ hearing_date: '2026-04-20', stage: 'Final Hearing' });
  });

  test('Court Notes are not visible from another tenant session (RLS)', async () => {
    const caseId = await createCase(TENANT_A);
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));

    const listRes = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_B) }), routeParams(caseId));
    const listBody = await listRes.json();
    expect(listBody.court_notes).toHaveLength(0);
  });

  test('CourtNote is append-only: direct UPDATE/DELETE is rejected by the database grant', async () => {
    const caseId = await createCase(TENANT_A);
    const createRes = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD),
      routeParams(caseId)
    );
    const { court_note } = await createRes.json();

    await expect(
      db.execute(TENANT_A, `UPDATE "CourtNote" SET note = 'tampered' WHERE id = $1`, [court_note.id])
    ).rejects.toThrow(/permission denied/i);

    await expect(db.execute(TENANT_A, `DELETE FROM "CourtNote" WHERE id = $1`, [court_note.id])).rejects.toThrow(
      /permission denied/i
    );
  });

  test('GET rejects an invalid (non-UUID) case id with 400', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('POST returns 404 for a well-formed but non-existent case id', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD),
      routeParams(NON_EXISTENT_ID)
    );
    expect(res.status).toBe(404);
  });
});
