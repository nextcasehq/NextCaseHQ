import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000e1';
const TENANT_B = '00000000-0000-4000-8000-0000000000e2';
const USER_ID = '00000000-0000-4000-8000-0000000000e3';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'matters-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(
  method: string,
  headers: Record<string, string>,
  body?: unknown,
  query = ''
): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/matters${query}`), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST/GET /api/matters — real Matter persistence', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matters Route Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matters Route Test Tenant B',
    ]);
    // POST/PATCH /api/matters now stamp created_by_user_id/updated_by_user_id
    // (Production Matter Register Foundation) — a real FK to "User", so the
    // session subject must exist as a real row, same as every other route's
    // test fixture in this codebase.
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'matters-test-author@nextcase.local']
    );
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  test('rejects POST with no session (401)', async () => {
    const req = buildRequest('POST', {}, { title: 'Untitled Matter' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('rejects POST from an untrusted origin even with a valid session', async () => {
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' },
      { title: 'Untitled Matter' }
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  test('rejects an invalid payload (400)', async () => {
    const req = buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('creates a matter under the session tenant, ignoring any client-supplied tenant_id', async () => {
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Advisory on Series B', tenant_id: TENANT_B }
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.matter.title).toBe('Advisory on Series B');
    expect(body.matter.tenant_id).toBe(TENANT_A);
    expect(body.matter.tenant_id).not.toBe(TENANT_B);
  });

  test('defaults status to ACTIVE and engagement_type to LITIGATION when not provided', async () => {
    const req = buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'No Defaults Given' });
    const res = await POST(req);
    const body = await res.json();
    expect(body.matter.status).toBe('ACTIVE');
    expect(body.matter.engagement_type).toBe('LITIGATION');
  });

  test('a Matter may exist with no litigation intent at all (ADVISORY engagement type)', async () => {
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Pure advisory engagement', engagement_type: 'ADVISORY' }
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.matter.engagement_type).toBe('ADVISORY');
  });

  test('rejects an invalid engagement_type (400)', async () => {
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Bad Engagement Type', engagement_type: 'NOT_A_REAL_TYPE' }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('links a real client_id and returns the joined client_name', async () => {
    const clientRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Acme Corp']
    );
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Matter for Acme', client_id: clientRows[0].id }
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.matter.client_id).toBe(clientRows[0].id);
    expect(body.matter.client_name).toBe('Acme Corp');
  });

  test('rejects a client_id belonging to another tenant (FK-bypasses-RLS re-verification)', async () => {
    const otherTenantClientRows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Tenant B Client']
    );
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Cross-tenant client attempt', client_id: otherTenantClientRows[0].id }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    await db.execute(TENANT_B, `DELETE FROM "Client" WHERE id = $1`, [otherTenantClientRows[0].id]);
  });

  test('rejects GET with no session (401)', async () => {
    const req = buildRequest('GET', {});
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test("lists only the calling tenant's own matters — real Postgres RLS, not app-level filtering", async () => {
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'Private A' }));
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_B) }, { title: 'Private B' }));

    const resA = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }));
    const bodyA = await resA.json();
    expect(bodyA.matters).toHaveLength(1);
    expect(bodyA.matters[0].title).toBe('Private A');

    const resB = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_B) }));
    const bodyB = await resB.json();
    expect(bodyB.matters).toHaveLength(1);
    expect(bodyB.matters[0].title).toBe('Private B');
  });

  test('filters the list by status', async () => {
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'Active One', status: 'ACTIVE' })
    );
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'On Hold One', status: 'ON_HOLD' })
    );

    const activeOnly = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?status=ACTIVE')
    );
    const activeBody = await activeOnly.json();
    expect(activeBody.matters).toHaveLength(1);
    expect(activeBody.matters[0].title).toBe('Active One');
  });

  test('filters the list by engagement_type', async () => {
    await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { title: 'Litigation Matter', engagement_type: 'LITIGATION' }
      )
    );
    await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { title: 'Advisory Matter', engagement_type: 'ADVISORY' }
      )
    );

    const advisoryOnly = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?engagement_type=ADVISORY')
    );
    const advisoryBody = await advisoryOnly.json();
    expect(advisoryBody.matters).toHaveLength(1);
    expect(advisoryBody.matters[0].title).toBe('Advisory Matter');
  });

  test('paginates with limit/offset and reports the true total independent of page size', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: `Matter ${i}` }));
    }

    const page1 = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?limit=2&offset=0')
    );
    const body1 = await page1.json();
    expect(body1.matters).toHaveLength(2);
    expect(body1.total).toBe(5);

    const page2 = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?limit=2&offset=2')
    );
    const body2 = await page2.json();
    expect(body2.matters).toHaveLength(2);

    const page1Ids = new Set(body1.matters.map((m: { id: string }) => m.id));
    const page2Ids = body2.matters.map((m: { id: string }) => m.id);
    expect(page2Ids.some((id: string) => page1Ids.has(id))).toBe(false);
  });

  test('rejects an out-of-range limit (400)', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?limit=1000'));
    expect(res.status).toBe(400);
  });
});
