import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = crypto.randomUUID();
const TENANT_B = crypto.randomUUID();
const USER_A = crypto.randomUUID();
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId, email: 'matter-preparation-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/matters/placeholder/preparation'), { headers });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/matters/[id]/preparation — Seven-Day Preparation view (Milestone 3)', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Preparation Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matter Preparation Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, `matter-preparation-author-${USER_A}@nextcase.local`]
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

  async function createCase(tenantId: string, matterId: string, hearingDate: string | null): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id, hearing_date) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenantId, 'Test Proceeding', 'IN', matterId, hearingDate]
    );
    return rows[0].id;
  }

  async function createCourtNote(
    tenantId: string,
    caseId: string,
    matterId: string,
    hearingDate: string,
    nextActions: string | null
  ): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note, next_actions
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [tenantId, caseId, matterId, USER_A, hearingDate, 'HIGH_COURT', 'High Court', 'Arguments', 'Adjourned for evidence.', nextActions]
    );
    return rows[0].id;
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

  test('returns 404 when the matter belongs to another tenant (RLS)', async () => {
    const matterId = await createMatter(TENANT_B);
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    expect(res.status).toBe(404);
  });

  test('a Matter with no Proceedings returns an empty array, not an error', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preparation).toEqual([]);
  });

  test('excludes a Proceeding with no hearing_date set', async () => {
    const matterId = await createMatter(TENANT_A);
    await createCase(TENANT_A, matterId, null);
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.preparation).toEqual([]);
  });

  test('excludes a hearing 8 days out (past the window)', async () => {
    const matterId = await createMatter(TENANT_A);
    await createCase(TENANT_A, matterId, daysFromToday(8));
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.preparation).toEqual([]);
  });

  test('excludes a hearing that already happened yesterday', async () => {
    const matterId = await createMatter(TENANT_A);
    await createCase(TENANT_A, matterId, daysFromToday(-1));
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.preparation).toEqual([]);
  });

  test('includes a hearing today (inclusive lower boundary)', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, daysFromToday(0));
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.preparation.map((p: { case_id: string }) => p.case_id)).toContain(caseId);
  });

  test('includes a hearing exactly 7 days out (inclusive upper boundary)', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, daysFromToday(7));
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.preparation.map((p: { case_id: string }) => p.case_id)).toContain(caseId);
  });

  test('surfaces stage, court forum, and last Court Note text from the most recent Court Note', async () => {
    const matterId = await createMatter(TENANT_A);
    const hearingDate = daysFromToday(3);
    const caseId = await createCase(TENANT_A, matterId, hearingDate);
    await createCourtNote(TENANT_A, caseId, matterId, hearingDate, null);
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    const item = body.preparation.find((p: { case_id: string }) => p.case_id === caseId);
    expect(item.stage).toBe('Arguments');
    expect(item.court_forum_display).toBe('High Court');
    expect(item.last_note).toBe('Adjourned for evidence.');
  });

  test('includes only PENDING pending actions, sourced from the linked Court Note', async () => {
    const matterId = await createMatter(TENANT_A);
    const hearingDate = daysFromToday(2);
    const caseId = await createCase(TENANT_A, matterId, hearingDate);
    const noteId = await createCourtNote(TENANT_A, caseId, matterId, hearingDate, 'File rejoinder');
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id, status) VALUES ($1, $2, $3, $4, 'PENDING')`,
      [TENANT_A, matterId, caseId, noteId]
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    const item = body.preparation.find((p: { case_id: string }) => p.case_id === caseId);
    expect(item.pending_actions).toHaveLength(1);
    expect(item.pending_actions[0].action_text).toBe('File rejoinder');
  });

  test('excludes a COMPLETED task from pending_actions', async () => {
    const matterId = await createMatter(TENANT_A);
    const hearingDate = daysFromToday(4);
    const caseId = await createCase(TENANT_A, matterId, hearingDate);
    const noteId = await createCourtNote(TENANT_A, caseId, matterId, hearingDate, 'Collect medical records');
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id, status) VALUES ($1, $2, $3, $4, 'COMPLETED')`,
      [TENANT_A, matterId, caseId, noteId]
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    const item = body.preparation.find((p: { case_id: string }) => p.case_id === caseId);
    expect(item.pending_actions).toEqual([]);
  });

  test('lists linked documents plainly, with no invented status', async () => {
    const matterId = await createMatter(TENANT_A);
    const hearingDate = daysFromToday(1);
    const caseId = await createCase(TENANT_A, matterId, hearingDate);
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, case_id, matter_id, title) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, caseId, matterId, 'Affidavit']
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    const item = body.preparation.find((p: { case_id: string }) => p.case_id === caseId);
    expect(item.documents).toEqual([{ id: expect.any(String), title: 'Affidavit' }]);
  });
});
