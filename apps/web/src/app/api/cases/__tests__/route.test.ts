import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000c1';
const TENANT_B = '00000000-0000-4000-8000-0000000000c2';
const USER_ID = '00000000-0000-4000-8000-00000000009b';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'cases-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(
  method: string,
  headers: Record<string, string>,
  body?: unknown,
  query = ''
): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/cases${query}`), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST/GET /api/cases — real LegalCase persistence', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Cases Route Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Cases Route Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  test('rejects POST with no session (401)', async () => {
    const req = buildRequest('POST', {}, { title: 'Untitled', country_code: 'IN' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('rejects POST from an untrusted origin even with a valid session', async () => {
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' },
      { title: 'Untitled', country_code: 'IN' }
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  test('rejects an invalid payload (400)', async () => {
    const req = buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { country_code: 'IN' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('creates a case under the session tenant, ignoring any client-supplied tenant_id in the body', async () => {
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Sharma vs. State', country_code: 'IN', tenant_id: TENANT_B }
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.case.title).toBe('Sharma vs. State');
    expect(body.case.tenant_id).toBe(TENANT_A);
    expect(body.case.tenant_id).not.toBe(TENANT_B);
  });

  test('rejects GET with no session (401)', async () => {
    const req = buildRequest('GET', {});
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  test('lists only the calling tenant\'s own cases — real Postgres RLS, not app-level filtering', async () => {
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'Private A', country_code: 'IN' })
    );
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_B) }, { title: 'Private B', country_code: 'US' })
    );

    const resA = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }));
    const bodyA = await resA.json();
    expect(bodyA.cases).toHaveLength(1);
    expect(bodyA.cases[0].title).toBe('Private A');
    expect(bodyA.total).toBe(1);

    const resB = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_B) }));
    const bodyB = await resB.json();
    expect(bodyB.cases).toHaveLength(1);
    expect(bodyB.cases[0].title).toBe('Private B');
  });

  test('paginates with limit/offset and reports the true total independent of the page size', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(
        buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: `Case ${i}`, country_code: 'IN' })
      );
    }

    const page1 = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?limit=2&offset=0')
    );
    const body1 = await page1.json();
    expect(body1.cases).toHaveLength(2);
    expect(body1.total).toBe(5);
    expect(body1.limit).toBe(2);
    expect(body1.offset).toBe(0);

    const page2 = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?limit=2&offset=2')
    );
    const body2 = await page2.json();
    expect(body2.cases).toHaveLength(2);
    expect(body2.total).toBe(5);

    // No overlap between pages.
    const page1Ids = new Set(body1.cases.map((c: { id: string }) => c.id));
    const page2Ids = body2.cases.map((c: { id: string }) => c.id);
    expect(page2Ids.some((id: string) => page1Ids.has(id))).toBe(false);
  });

  test('defaults to a sane page size when no limit/offset is given', async () => {
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'Only Case', country_code: 'IN' })
    );
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }));
    const body = await res.json();
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
  });

  test('rejects an out-of-range limit (400)', async () => {
    const res = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?limit=1000')
    );
    expect(res.status).toBe(400);
  });

  test('rejects a negative offset (400)', async () => {
    const res = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?offset=-1')
    );
    expect(res.status).toBe(400);
  });
});
