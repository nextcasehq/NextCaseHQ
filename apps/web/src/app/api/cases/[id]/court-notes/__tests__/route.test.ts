import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { getCachedMatterContext } from '@/lib/ai/context/cache';

const TENANT_A = '26d78714-6af1-451b-84ae-c169a64cf08a';
const TENANT_B = '2dbe41f0-fbd9-424f-8836-a970447092cb';
const USER_ID = 'd2b8aa80-42d1-4efb-98bb-18989f765cf4';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

function hasRedis(): boolean {
  return Boolean(process.env.REDIS_URL);
}

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
  hearing_outcome: 'CONDUCTED',
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

  async function setCurrentProceeding(tenantId: string, matterId: string, caseId: string): Promise<void> {
    await db.execute(tenantId, `UPDATE "Matter" SET current_proceeding_id = $2 WHERE id = $1`, [matterId, caseId]);
  }

  async function readMatterHeader(
    tenantId: string,
    matterId: string
  ): Promise<{ current_stage: string | null; next_hearing_date: string | null }> {
    const rows = await db.execute<{ current_stage: string | null; next_hearing_date: string | null }>(
      tenantId,
      `SELECT current_stage, next_hearing_date::text FROM "Matter" WHERE id = $1`,
      [matterId]
    );
    return rows[0];
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
    // hearing_date is the Proceeding's next scheduled hearing, not the one
    // that just happened — VALID_PAYLOAD's next_hearing_date is 2026-03-15,
    // not its (already-occurred) hearing_date of 2026-02-01.
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
    // hearing_date follows the second note's next_hearing_date (2026-04-20),
    // not its own hearing_date (2026-03-15, already in the past by now).
    expect(caseRows[0]).toMatchObject({ hearing_date: '2026-04-20', stage: 'Final Hearing' });
  });

  test('a Court Note with no next_hearing_date clears the Proceeding hearing_date rather than leaving it stale', async () => {
    const caseId = await createCase(TENANT_A);
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));

    const { next_hearing_date: _omit, ...payloadWithNoNextHearing } = VALID_PAYLOAD as typeof VALID_PAYLOAD & {
      next_hearing_date?: string;
    };
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { ...payloadWithNoNextHearing, hearing_date: '2026-03-15', stage: 'Disposed', note: 'Petition disposed of.' }
      ),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);

    const caseRows = await db.execute<{ hearing_date: string | null }>(
      TENANT_A,
      `SELECT hearing_date FROM "LegalCase" WHERE id = $1`,
      [caseId]
    );
    expect(caseRows[0].hearing_date).toBeNull();
  });

  test('the Matter timeline entry states the next hearing date when one was fixed', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));

    const events = await db.execute<{ description: string }>(
      TENANT_A,
      `SELECT description FROM "MatterEvent" WHERE matter_id = $1`,
      [matterId]
    );
    expect(events).toHaveLength(1);
    expect(events[0].description).toContain('Next hearing: 2026-03-15');
  });

  test('the Matter timeline entry omits "Next hearing" when none was fixed', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    const { next_hearing_date: _omit, ...payloadWithNoNextHearing } = VALID_PAYLOAD as typeof VALID_PAYLOAD & {
      next_hearing_date?: string;
    };
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, payloadWithNoNextHearing),
      routeParams(caseId)
    );

    const events = await db.execute<{ description: string }>(
      TENANT_A,
      `SELECT description FROM "MatterEvent" WHERE matter_id = $1`,
      [matterId]
    );
    expect(events).toHaveLength(1);
    expect(events[0].description).not.toContain('Next hearing:');
  });

  test('POST on the Matter\'s current Proceeding refreshes Matter.current_stage/next_hearing_date', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    await setCurrentProceeding(TENANT_A, matterId, caseId);

    const before = await readMatterHeader(TENANT_A, matterId);
    expect(before.current_stage).toBeNull();
    expect(before.next_hearing_date).toBeNull();

    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);

    const after = await readMatterHeader(TENANT_A, matterId);
    expect(after.current_stage).toBe('Arguments');
    expect(after.next_hearing_date).toBe('2026-03-15');
  });

  test('POST on a Proceeding that is NOT the Matter\'s current_proceeding_id leaves Matter.current_stage/next_hearing_date untouched', async () => {
    const matterId = await createMatter(TENANT_A);
    const currentCaseId = await createCase(TENANT_A, matterId);
    const priorCaseId = await createCase(TENANT_A, matterId);
    await setCurrentProceeding(TENANT_A, matterId, currentCaseId);
    // Seed a real current_stage/next_hearing_date on the Matter first, via
    // its actual current Proceeding, so we can prove a note on the *other*
    // (non-current) Proceeding doesn't overwrite it with stale text.
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(currentCaseId));
    const before = await readMatterHeader(TENANT_A, matterId);
    expect(before).toMatchObject({ current_stage: 'Arguments', next_hearing_date: '2026-03-15' });

    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { ...VALID_PAYLOAD, stage: 'Superseded Stage', next_hearing_date: '2099-01-01' }
      ),
      routeParams(priorCaseId)
    );
    expect(res.status).toBe(201);

    const after = await readMatterHeader(TENANT_A, matterId);
    expect(after).toMatchObject({ current_stage: 'Arguments', next_hearing_date: '2026-03-15' });
  });

  test('POST with no next_hearing_date clears Matter.next_hearing_date, not just the Proceeding\'s', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    await setCurrentProceeding(TENANT_A, matterId, caseId);
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));

    const { next_hearing_date: _omit, ...payloadWithNoNextHearing } = VALID_PAYLOAD as typeof VALID_PAYLOAD & {
      next_hearing_date?: string;
    };
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { ...payloadWithNoNextHearing, hearing_date: '2026-03-15', stage: 'Disposed', note: 'Petition disposed of.' }
      ),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);

    const after = await readMatterHeader(TENANT_A, matterId);
    expect(after).toMatchObject({ current_stage: 'Disposed', next_hearing_date: null });
  });

  test('POST on a Proceeding with no Matter never attempts a Matter update (no current_proceeding_id to match)', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);
    // No assertion target (no Matter exists) — this only proves the route
    // doesn't throw when target_case.matter_id is NULL.
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

  test('POST rejects a Court Note on a Proceeding whose Matter is closed (409), and inserts nothing', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    await db.execute(TENANT_A, `UPDATE "Matter" SET status = 'CLOSED' WHERE id = $1`, [matterId]);

    const before = await db.execute<{ count: number }>(
      TENANT_A,
      `SELECT COUNT(*)::int AS count FROM "CourtNote" WHERE case_id = $1`,
      [caseId]
    );
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('MATTER_CLOSED_READ_ONLY');

    const after = await db.execute<{ count: number }>(
      TENANT_A,
      `SELECT COUNT(*)::int AS count FROM "CourtNote" WHERE case_id = $1`,
      [caseId]
    );
    expect(after[0].count).toBe(before[0].count);
  });

  test('POST on a Proceeding with no Matter is unaffected by any Matter closure elsewhere', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);
  });

  test('POST defaults source to ADVOCATE_ENTRY and verification_status to ADVOCATE_CONFIRMED, and stamps confirmed_by/confirmed_at', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.court_note.source).toBe('ADVOCATE_ENTRY');
    expect(body.court_note.verification_status).toBe('ADVOCATE_CONFIRMED');
    expect(body.court_note.confirmed_by).toBe(USER_ID);
    expect(body.court_note.confirmed_at).not.toBeNull();
  });

  test('POST accepts an explicit ECOURTS_CONFIRMED source, matching the eCourts manual-verification flow', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { ...VALID_PAYLOAD, source: 'ECOURTS_CONFIRMED' }),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.court_note.source).toBe('ECOURTS_CONFIRMED');
    expect(body.court_note.verification_status).toBe('ECOURTS_CONFIRMED');
  });

  test('POST captures previous_hearing_date/previous_stage from the Proceeding as it stood before this update', async () => {
    const caseId = await createCase(TENANT_A);
    const first = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    const firstBody = await first.json();
    expect(firstBody.court_note.previous_hearing_date).toBeNull();
    expect(firstBody.court_note.previous_stage).toBeNull();

    const second = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { ...VALID_PAYLOAD, hearing_date: '2026-03-15', stage: 'Final Hearing', note: 'Order reserved after arguments.' }
      ),
      routeParams(caseId)
    );
    const secondBody = await second.json();
    // previous_hearing_date is the Proceeding's hearing_date immediately
    // before this update — which, correctly, is VALID_PAYLOAD's
    // next_hearing_date (2026-03-15) propagated forward by the first POST,
    // not that first POST's own (already-past) hearing_date of 2026-02-01.
    expect(secondBody.court_note.previous_hearing_date).toBe('2026-03-15');
    expect(secondBody.court_note.previous_stage).toBe('Arguments');
  });

  test('POST idempotency: an identical resubmission (same hearing_date/stage/note) is a no-op — no duplicate Court Note or MatterEvent', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    const first = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(first.status).toBe(201);
    const firstBody = await first.json();

    const eventsBefore = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "MatterEvent" WHERE matter_id = $1`, [matterId]);

    const second = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.no_op).toBe(true);
    expect(secondBody.court_note.id).toBe(firstBody.court_note.id);

    const notes = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "CourtNote" WHERE case_id = $1`, [caseId]);
    expect(notes).toHaveLength(1);

    const eventsAfter = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "MatterEvent" WHERE matter_id = $1`, [matterId]);
    expect(eventsAfter).toHaveLength(eventsBefore.length);
  });

  test('a genuinely different resubmission (different note text) after an identical one is NOT treated as a no-op', async () => {
    const caseId = await createCase(TENANT_A);
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { ...VALID_PAYLOAD, note: 'A materially different note.' }),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);
    const notes = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "CourtNote" WHERE case_id = $1`, [caseId]);
    expect(notes).toHaveLength(2);
  });

  test('end-to-end: AI/drafting context reflects the corrected next hearing date after a Court Note save', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    await getCachedMatterContext(TENANT_A, matterId); // prime the cache — no hearing_date yet

    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, VALID_PAYLOAD), routeParams(caseId));
    expect(res.status).toBe(201);

    const items = await getCachedMatterContext(TENANT_A, matterId);
    // Both consumers of Matter context must see the *next* hearing
    // (VALID_PAYLOAD's next_hearing_date, 2026-03-15), not the hearing that
    // just happened (2026-02-01) — this is what a real /api/ai/draft or
    // /api/ai/ask call sees for this Matter once the fix is deployed.
    const proceedingItem = items.find((i) => i.sourceType === 'PROCEEDING');
    expect(proceedingItem?.render()).toContain('next hearing 2026-03-15');
    const chronologyItem = items.find((i) => i.sourceType === 'CHRONOLOGY_ENTRY');
    expect(chronologyItem?.render()).toContain('Next hearing: 2026-03-15');
  });

  describe('hearing_outcome — structured, first-class (Case Diary Phase 1 closure)', () => {
    test('rejects a Court Note with no hearing_outcome', async () => {
      const caseId = await createCase(TENANT_A);
      const { hearing_outcome: _omit, ...payloadWithNoOutcome } = VALID_PAYLOAD as typeof VALID_PAYLOAD & {
        hearing_outcome?: string;
      };
      const res = await POST(
        buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, payloadWithNoOutcome),
        routeParams(caseId)
      );
      expect(res.status).toBe(400);
    });

    test.each([
      ['CONDUCTED', 'HEARING'],
      ['ADJOURNED', 'HEARING'],
      ['RESERVED_FOR_ORDERS', 'HEARING'],
      ['DISPOSED', 'DISPOSED'],
      ['DISMISSED', 'DISPOSED'],
      ['WITHDRAWN', 'DISPOSED'],
      ['SETTLED', 'DISPOSED'],
      ['JUDGMENT_PRONOUNCED', 'DISPOSED'],
    ])('hearing_outcome=%s moves the Proceeding to status=%s', async (outcome, expectedStatus) => {
      const caseId = await createCase(TENANT_A);
      const res = await POST(
        buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { ...VALID_PAYLOAD, hearing_outcome: outcome }),
        routeParams(caseId)
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.court_note.hearing_outcome).toBe(outcome);

      const caseRows = await db.execute<{ status: string }>(TENANT_A, `SELECT status FROM "LegalCase" WHERE id = $1`, [caseId]);
      expect(caseRows[0].status).toBe(expectedStatus);
    });

    test('a terminal outcome on one Proceeding does not close the parent Matter', async () => {
      const matterId = await createMatter(TENANT_A);
      const caseId = await createCase(TENANT_A, matterId);
      await setCurrentProceeding(TENANT_A, matterId, caseId);

      await POST(
        buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { ...VALID_PAYLOAD, hearing_outcome: 'DISPOSED' }),
        routeParams(caseId)
      );

      const matterRows = await db.execute<{ status: string }>(TENANT_A, `SELECT status FROM "Matter" WHERE id = $1`, [matterId]);
      expect(matterRows[0].status).toBe('ACTIVE');
    });
  });
});
