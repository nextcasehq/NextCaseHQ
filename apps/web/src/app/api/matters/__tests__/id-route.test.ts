import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../[id]/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000f1';
const TENANT_B = '00000000-0000-4000-8000-0000000000f2';
const USER_ID = '00000000-0000-4000-8000-0000000000f3';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'matters-id-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/matters/00000000-0000-4000-8000-000000000000`), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('GET/PATCH/DELETE /api/matters/[id]', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matters ID Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matters ID Test Tenant B',
    ]);
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

  async function createMatter(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, title]
    );
    return rows[0].id;
  }

  test('rejects an invalid matter id (400)', async () => {
    const req = new NextRequest('http://localhost/api/matters/not-a-uuid', {
      headers: { cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'not-a-uuid' }) });
    expect(res.status).toBe(400);
  });

  test('rejects GET with no session (401)', async () => {
    const id = await createMatter(TENANT_A, 'Some Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`);
    const res = await GET(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(401);
  });

  test('returns 404 for a matter belonging to another tenant — RLS scoping, not a permission leak', async () => {
    const id = await createMatter(TENANT_B, 'Tenant B Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      headers: { cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await GET(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
  });

  test('returns the matter for its own tenant', async () => {
    const id = await createMatter(TENANT_A, 'My Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      headers: { cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await GET(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matter.title).toBe('My Matter');
  });

  test('PATCH updates provided fields and always bumps updated_at', async () => {
    const id = await createMatter(TENANT_A, 'Original Title');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ status: 'ON_HOLD' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matter.status).toBe('ON_HOLD');
    expect(body.matter.title).toBe('Original Title');
  });

  test('PATCH rejects an empty update payload (400)', async () => {
    const id = await createMatter(TENANT_A, 'Untouched');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(400);
  });

  test('PATCH returns 404 for a matter belonging to another tenant', async () => {
    const id = await createMatter(TENANT_B, 'Tenant B Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ status: 'CLOSED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
  });

  test('DELETE removes the matter and returns 404 on a second delete', async () => {
    const id = await createMatter(TENANT_A, 'To Be Deleted');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);

    const secondReq = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const secondRes = await DELETE(secondReq, { params: Promise.resolve({ id }) });
    expect(secondRes.status).toBe(404);
  });
});
