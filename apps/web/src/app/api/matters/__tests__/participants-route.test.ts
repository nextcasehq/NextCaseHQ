import { NextRequest } from 'next/server';
import { GET, POST } from '../[id]/participants/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000201';
const TENANT_B = '00000000-0000-4000-8000-000000000202';
const SESSION_USER_ID = '00000000-0000-4000-8000-000000000203';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: SESSION_USER_ID, tenantId, email: 'matter-participants-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

describe('GET/POST /api/matters/[id]/participants — Matter team assignment', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Participants Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matter Participants Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_B]);
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

  async function createUser(tenantId: string, email: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "User" (tenant_id, email) VALUES ($1, $2) RETURNING id`,
      [tenantId, email]
    );
    return rows[0].id;
  }

  test('rejects POST with no session (401)', async () => {
    const matterId = await createMatter(TENANT_A);
    const req = new NextRequest(`http://localhost/api/matters/${matterId}/participants`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ user_id: SESSION_USER_ID }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(401);
  });

  test('rejects a user_id belonging to another tenant', async () => {
    const matterId = await createMatter(TENANT_A);
    const otherTenantUserId = await createUser(TENANT_B, 'other-tenant-user@nextcase.local');
    const req = new NextRequest(`http://localhost/api/matters/${matterId}/participants`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ user_id: otherTenantUserId }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(400);
  });

  test('returns 404 when the matter belongs to another tenant', async () => {
    const matterId = await createMatter(TENANT_B);
    const userId = await createUser(TENANT_A, 'assignee@nextcase.local');
    const req = new NextRequest(`http://localhost/api/matters/${matterId}/participants`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ user_id: userId }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(404);
  });

  test('assigns a user with a default role of ASSOCIATE and lists it back with joined user info', async () => {
    const matterId = await createMatter(TENANT_A);
    const userId = await createUser(TENANT_A, 'assignee@nextcase.local');

    const createRes = await POST(
      new NextRequest(`http://localhost/api/matters/${matterId}/participants`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
        body: JSON.stringify({ user_id: userId }),
      }),
      { params: Promise.resolve({ id: matterId }) }
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.participant.role).toBe('ASSOCIATE');
    expect(createBody.participant.user_email).toBe('assignee@nextcase.local');

    const listRes = await GET(
      new NextRequest(`http://localhost/api/matters/${matterId}/participants`, {
        headers: { cookie: await sessionCookieHeader(TENANT_A) },
      }),
      { params: Promise.resolve({ id: matterId }) }
    );
    const listBody = await listRes.json();
    expect(listBody.participants).toHaveLength(1);
  });

  test('rejects assigning the same user to the same matter twice (409)', async () => {
    const matterId = await createMatter(TENANT_A);
    const userId = await createUser(TENANT_A, 'duplicate@nextcase.local');

    await POST(
      new NextRequest(`http://localhost/api/matters/${matterId}/participants`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
        body: JSON.stringify({ user_id: userId, role: 'LEAD' }),
      }),
      { params: Promise.resolve({ id: matterId }) }
    );

    const secondRes = await POST(
      new NextRequest(`http://localhost/api/matters/${matterId}/participants`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
        body: JSON.stringify({ user_id: userId, role: 'VIEWER' }),
      }),
      { params: Promise.resolve({ id: matterId }) }
    );
    expect(secondRes.status).toBe(409);
  });
});
