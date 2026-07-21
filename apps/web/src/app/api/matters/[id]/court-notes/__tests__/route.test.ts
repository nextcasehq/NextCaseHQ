import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

// Genuinely unique tenant/user ids — never the shared d1/d2 pattern
// recorded as technical debt in docs/PENDING_INTEGRATION_REGISTER.md.
const TENANT_A = '634c6a94-d58f-4529-9b75-1e47fa7cfcde';
const TENANT_B = '51aaec73-e471-4a7e-91d8-0b999016613b';
const USER_A = '78d92f63-1648-4ed2-a089-1c9b2b7eb7c6';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId, email: 'matter-court-notes-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/matters/placeholder/court-notes'), { headers });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/matters/[id]/court-notes — Matter-level aggregation (Milestone 2)', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Court Notes Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matter Court Notes Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'matter-court-notes-author@nextcase.local']
    );
  });

  // CourtNote is append-only and CourtNote.case_id is RESTRICT — this
  // suite never deletes rows it creates, same accepted pattern as
  // lib/documents/__tests__/access-audit.test.ts. Every test uses a fresh
  // Matter/Proceeding pair via gen_random_uuid().
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

  async function createCourtNote(
    tenantId: string,
    caseId: string,
    matterId: string,
    hearingDate: string
  ): Promise<void> {
    await db.execute(
      tenantId,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [tenantId, caseId, matterId, USER_A, hearingDate, 'HIGH_COURT', 'High Court', 'Arguments', 'Test note']
    );
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

  test('returns 404 when the matter belongs to another tenant (RLS, not app-level filtering)', async () => {
    const matterId = await createMatter(TENANT_B);
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    expect(res.status).toBe(404);
  });

  test('aggregates Court Notes across every Proceeding linked to the Matter, newest first, correctly attributed', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseA = await createCase(TENANT_A, matterId, 'Proceeding A');
    const caseB = await createCase(TENANT_A, matterId, 'Proceeding B');
    await createCourtNote(TENANT_A, caseA, matterId, '2026-01-10');
    await createCourtNote(TENANT_A, caseB, matterId, '2026-02-15');

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.court_notes).toHaveLength(2);
    expect(body.court_notes[0].case_title).toBe('Proceeding B');
    expect(body.court_notes[0].hearing_date).toBe('2026-02-15');
    expect(body.court_notes[1].case_title).toBe('Proceeding A');
  });

  test('a Proceeding not linked to any Matter contributes no rows', async () => {
    const matterId = await createMatter(TENANT_A);
    const rows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Unlinked Proceeding', 'IN']
    );
    const unlinkedCaseId = rows[0].id;
    await db.execute(
      TENANT_A,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note
       ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)`,
      [TENANT_A, unlinkedCaseId, USER_A, '2026-01-01', 'HIGH_COURT', 'High Court', 'Arguments', 'Unrelated']
    );

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const body = await res.json();
    expect(body.court_notes).toHaveLength(0);
  });

  test('Court Notes are not visible from another tenant session (RLS)', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, 'Tenant A Proceeding');
    await createCourtNote(TENANT_A, caseId, matterId, '2026-01-10');

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }), routeParams(matterId));
    expect(res.status).toBe(404);
  });
});
