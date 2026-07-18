import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000f61';
const TENANT_B = '00000000-0000-4000-8000-000000000f62';
const USER_A = '00000000-0000-4000-8000-000000000f63';
const USER_A2 = '00000000-0000-4000-8000-000000000f64';

async function sessionCookieHeader(tenantId: string, userId: string): Promise<string> {
  const token = await signSessionToken({ sub: userId, tenantId, email: `${userId}@nextcase.local` });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/notifications/placeholder'), {
    method: 'PATCH',
    headers: { origin: 'http://localhost:3000', ...headers },
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/notifications/[id]', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Notification Mark-Read Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Notification Mark-Read Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'mark-read-user-a@nextcase.local']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A2, TENANT_A, 'mark-read-user-a2@nextcase.local']
    );
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Notification" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Notification" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  async function createNotification(tenantId: string, userId: string | null, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Notification" (tenant_id, user_id, type, title) VALUES ($1, $2, 'HEARING', $3) RETURNING id`,
      [tenantId, userId, title]
    );
    return rows[0].id;
  }

  test('rejects an invalid (non-UUID) id with 400', async () => {
    const res = await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A, USER_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('rejects with no session (401)', async () => {
    const id = await createNotification(TENANT_A, USER_A, 'Auth check');
    const res = await PATCH(buildRequest({}), routeParams(id));
    expect(res.status).toBe(401);
  });

  test('marks the addressed user\'s own notification as read', async () => {
    const id = await createNotification(TENANT_A, USER_A, 'Personal notification');
    const res = await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A, USER_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notification.read_at).not.toBeNull();
  });

  test('marks a tenant-wide notification (user_id NULL) as read for any user at the tenant', async () => {
    const id = await createNotification(TENANT_A, null, 'Tenant-wide notification');
    const res = await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A, USER_A2) }), routeParams(id));
    expect(res.status).toBe(200);
  });

  test("returns 404 for a notification addressed to a different user at the same tenant", async () => {
    const id = await createNotification(TENANT_A, USER_A, 'Only for user A');
    const res = await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A, USER_A2) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('returns 404 for a notification belonging to a different tenant', async () => {
    const id = await createNotification(TENANT_B, null, 'Tenant B announcement');
    const res = await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A, USER_A) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('returns 404 when marking an already-read notification again', async () => {
    const id = await createNotification(TENANT_A, USER_A, 'Double mark-read');
    await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A, USER_A) }), routeParams(id));
    const res = await PATCH(buildRequest({ cookie: await sessionCookieHeader(TENANT_A, USER_A) }), routeParams(id));
    expect(res.status).toBe(404);
  });
});
