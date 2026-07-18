import { NextRequest } from 'next/server';
import { GET, DELETE } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000e3';
const TENANT_B = '00000000-0000-4000-8000-0000000000e4';
const USER_ID = '00000000-0000-4000-8000-00000000009e';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'document-detail-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/placeholder'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET/DELETE /api/documents/[id]', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Document Detail Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Document Detail Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createDocument(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, title]
    );
    return rows[0].id;
  }

  test('GET rejects an invalid (non-UUID) id with 400', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('GET rejects with no session (401)', async () => {
    const id = await createDocument(TENANT_A, 'Needs Auth');
    const res = await GET(buildRequest('GET', {}), routeParams(id));
    expect(res.status).toBe(401);
  });

  test('GET returns the document for the owning tenant', async () => {
    const id = await createDocument(TENANT_A, 'Owned Document');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document.title).toBe('Owned Document');
  });

  test('GET returns 404 for a real document belonging to a different tenant (RLS-backed, not a permission leak)', async () => {
    const id = await createDocument(TENANT_A, 'Belongs To A');
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

  test('DELETE rejects an untrusted origin', async () => {
    const id = await createDocument(TENANT_A, 'To Delete');
    const res = await DELETE(
      buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }),
      routeParams(id)
    );
    expect(res.status).toBe(403);
  });

  test('DELETE removes the document for the owning tenant', async () => {
    const id = await createDocument(TENANT_A, 'To Delete');
    const res = await DELETE(buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);

    const verify = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(verify.status).toBe(404);
  });

  test('DELETE cannot remove a document belonging to a different tenant', async () => {
    const id = await createDocument(TENANT_A, 'Protected');
    const res = await DELETE(buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);

    const verify = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(verify.status).toBe(200);
  });
});
