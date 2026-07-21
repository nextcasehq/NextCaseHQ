import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000301';
const TENANT_B = '00000000-0000-4000-8000-000000000302';
const USER_ID = '00000000-0000-4000-8000-000000000303';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'clients-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown, query = ''): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/clients${query}`), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST/GET /api/clients — minimal Client persistence', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Clients Route Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Clients Route Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  test('rejects POST with no session (401)', async () => {
    const req = buildRequest('POST', {}, { name: 'Acme Corp' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('rejects an invalid payload (400)', async () => {
    const req = buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { name: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('creates a client under the session tenant', async () => {
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { name: 'Acme Corp', email: 'contact@acme.example', tenant_id: TENANT_B }
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.client.name).toBe('Acme Corp');
    expect(body.client.tenant_id).toBe(TENANT_A);
  });

  test("lists only the calling tenant's own clients", async () => {
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { name: 'Private A' }));
    await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_B) }, { name: 'Private B' }));

    const resA = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }));
    const bodyA = await resA.json();
    expect(bodyA.clients).toHaveLength(1);
    expect(bodyA.clients[0].name).toBe('Private A');
  });
});
