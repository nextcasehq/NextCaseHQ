import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000d1';
const TENANT_B = '00000000-0000-4000-8000-0000000000d2';
const USER_ID = '00000000-0000-4000-8000-00000000009c';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'case-detail-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/cases/placeholder'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET/PATCH/DELETE /api/cases/[id]', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Case Detail Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Case Detail Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    // DocumentEnvelope.case_id is RESTRICT, not CASCADE (Sprint 3, PR 3A) —
    // must be cleared (versions first, then envelopes) before the cases
    // they reference, or this cleanup itself would fail with a foreign
    // key violation for any test that links a document to a case.
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createCase(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [tenantId, title, 'IN']
    );
    return rows[0].id;
  }

  test('GET rejects an invalid (non-UUID) id with 400', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('GET rejects with no session (401)', async () => {
    const id = await createCase(TENANT_A, 'Needs Auth');
    const res = await GET(buildRequest('GET', {}), routeParams(id));
    expect(res.status).toBe(401);
  });

  test('GET returns the case for the owning tenant', async () => {
    const id = await createCase(TENANT_A, 'Owned Case');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.case.title).toBe('Owned Case');
    expect(body.case.status).toBe('PENDING');
  });

  test('GET returns 404 (not a permission error) for a real case belonging to a different tenant — RLS-backed, not app-level filtering', async () => {
    const id = await createCase(TENANT_A, 'Belongs To A');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('GET returns 404 for a well-formed but non-existent id', async () => {
    const res = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }),
      routeParams(NON_EXISTENT_ID)
    );
    expect(res.status).toBe(404);
  });

  test('PATCH rejects an untrusted origin', async () => {
    const id = await createCase(TENANT_A, 'To Patch');
    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }, { title: 'New Title' }),
      routeParams(id)
    );
    expect(res.status).toBe(403);
  });

  test('PATCH rejects an empty update body', async () => {
    const id = await createCase(TENANT_A, 'To Patch');
    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, {}),
      routeParams(id)
    );
    expect(res.status).toBe(400);
  });

  test('PATCH updates the title and persists it', async () => {
    const id = await createCase(TENANT_A, 'Old Title');
    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'New Title' }),
      routeParams(id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.case.title).toBe('New Title');

    const verify = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    const verifyBody = await verify.json();
    expect(verifyBody.case.title).toBe('New Title');
  });

  test('PATCH updates the real structural fields (status, court, judge, stage, hearing_date, notes)', async () => {
    const id = await createCase(TENANT_A, 'Litigation Matter');
    const res = await PATCH(
      buildRequest(
        'PATCH',
        { cookie: await sessionCookieHeader(TENANT_A) },
        {
          status: 'HEARING',
          court: 'US District Court, N.D. California',
          judge: 'Judge Lucy Koh',
          stage: 'Fact Discovery / Depositions',
          hearing_date: '2026-03-01',
          notes: 'Exhibits A through G loaded.',
        }
      ),
      routeParams(id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.case).toMatchObject({
      status: 'HEARING',
      court: 'US District Court, N.D. California',
      judge: 'Judge Lucy Koh',
      stage: 'Fact Discovery / Depositions',
      hearing_date: '2026-03-01',
      notes: 'Exhibits A through G loaded.',
    });
  });

  test('PATCH rejects an invalid status value (400)', async () => {
    const id = await createCase(TENANT_A, 'To Patch');
    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { status: 'NOT_REAL' }),
      routeParams(id)
    );
    expect(res.status).toBe(400);
  });

  test('PATCH rejects a malformed hearing_date (400)', async () => {
    const id = await createCase(TENANT_A, 'To Patch');
    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { hearing_date: 'not-a-date' }),
      routeParams(id)
    );
    expect(res.status).toBe(400);
  });

  test('PATCH cannot modify a case belonging to a different tenant (404, no cross-tenant write)', async () => {
    const id = await createCase(TENANT_A, 'Belongs To A');
    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_B) }, { title: 'Hijacked' }),
      routeParams(id)
    );
    expect(res.status).toBe(404);

    const verify = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    const verifyBody = await verify.json();
    expect(verifyBody.case.title).toBe('Belongs To A');
  });

  test('DELETE removes the case for the owning tenant', async () => {
    const id = await createCase(TENANT_A, 'To Delete');
    const res = await DELETE(buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);

    const verify = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(verify.status).toBe(404);
  });

  test('DELETE cannot remove a case belonging to a different tenant', async () => {
    const id = await createCase(TENANT_A, 'Protected');
    const res = await DELETE(buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);

    const verify = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(verify.status).toBe(200);
  });

  test('DELETE returns a deterministic 409 (never a raw 500) when a document is linked, and leaves the case intact', async () => {
    const id = await createCase(TENANT_A, 'Case With Linked Document');
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, case_id, title) VALUES ($1, $2, $3)`,
      [TENANT_A, id, 'Linked Document']
    );

    const res = await DELETE(buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('CASE_HAS_LINKED_DOCUMENTS');
    expect(body.linked.documents).toBe(1);

    const stillThere = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "LegalCase" WHERE id = $1`, [id]);
    expect(stillThere).toHaveLength(1);
  });
});
