import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '22db0697-0db6-4502-8bc3-19062f3fee50';
const TENANT_B = 'cacdc7aa-cf10-43fb-8519-cd10375ba121';
const USER_A = 'e58835a0-eee7-455d-8aee-a7c340f819cf';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId, email: 'matter-health-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/matters/placeholder/health'), { headers });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/matters/[id]/health — Matter Health summary (Milestone 2)', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Health Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matter Health Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'matter-health-author@nextcase.local']
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

  async function createCase(
    tenantId: string,
    matterId: string,
    status: string,
    hearingDate: string | null
  ): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id, status, hearing_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [tenantId, 'Test Proceeding', 'IN', matterId, status, hearingDate]
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

  test('a Matter with no Proceedings or Court Notes yet returns an honest empty state, not an error', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.health).toMatchObject({
      stage: null,
      next_hearing_date: null,
      pending_action_count: 0,
      needs_attention: false,
    });
  });

  test('needs_attention is true when an active Proceeding has no hearing_date set', async () => {
    const matterId = await createMatter(TENANT_A);
    await createCase(TENANT_A, matterId, 'PENDING', null);
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.health.needs_attention).toBe(true);
  });

  test('needs_attention is false once a hearing_date is scheduled, and next_hearing_date reflects the soonest one', async () => {
    const matterId = await createMatter(TENANT_A);
    await createCase(TENANT_A, matterId, 'HEARING', '2026-05-01');
    await createCase(TENANT_A, matterId, 'HEARING', '2026-03-01');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.health.needs_attention).toBe(false);
    expect(body.health.next_hearing_date).toBe('2026-03-01');
  });

  test('needs_attention is false when the only open Proceeding is DISPOSED', async () => {
    const matterId = await createMatter(TENANT_A);
    await createCase(TENANT_A, matterId, 'DISPOSED', null);
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.health.needs_attention).toBe(false);
  });

  test('stage/last activity reflect the most recent Court Note across all Proceedings', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, 'HEARING', '2026-01-01');
    await db.execute(
      TENANT_A,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [TENANT_A, caseId, matterId, USER_A, '2026-01-15', 'HIGH_COURT', 'High Court', 'Final Hearing', 'Order reserved.']
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.health.stage).toBe('Final Hearing');
    expect(body.health.last_hearing_date).toBe('2026-01-15');
    expect(body.health.last_note).toBe('Order reserved.');
  });

  test('pending_action_count reflects only PENDING MatterTask rows for this Matter', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, 'HEARING', '2026-01-01');
    const noteRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note, next_actions
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [TENANT_A, caseId, matterId, USER_A, '2026-01-15', 'HIGH_COURT', 'High Court', 'Arguments', 'Note', 'Prepare rejoinder']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id, status) VALUES ($1, $2, $3, $4, 'PENDING')`,
      [TENANT_A, matterId, caseId, noteRows[0].id]
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.health.pending_action_count).toBe(1);
  });
});
