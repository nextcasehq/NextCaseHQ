import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000f51';
const TENANT_B = '00000000-0000-4000-8000-000000000f52';
const USER_A = '00000000-0000-4000-8000-000000000f53';
const USER_A2 = '00000000-0000-4000-8000-000000000f54';

async function sessionCookieHeader(tenantId: string, userId: string): Promise<string> {
  const token = await signSessionToken({ sub: userId, tenantId, email: `${userId}@nextcase.local` });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(url: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url), { headers });
}

describe('GET /api/notifications', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Notifications Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Notifications Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'user-a@nextcase.local']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A2, TENANT_A, 'user-a2@nextcase.local']
    );

    // Personal notification for USER_A, a tenant-wide one, and one addressed
    // to a different user at the same tenant (should not appear for USER_A).
    await db.execute(
      TENANT_A,
      `INSERT INTO "Notification" (tenant_id, user_id, type, title, read_at)
       VALUES ($1, $2, 'HEARING', 'Personal reminder for user A', NULL)`,
      [TENANT_A, USER_A]
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "Notification" (tenant_id, user_id, type, title, read_at)
       VALUES ($1, NULL, 'BILLING', 'Tenant-wide announcement', NULL)`,
      [TENANT_A]
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "Notification" (tenant_id, user_id, type, title, read_at)
       VALUES ($1, $2, 'INGEST', 'Addressed to a different user', NULL)`,
      [TENANT_A, USER_A2]
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "Notification" (tenant_id, user_id, type, title, read_at)
       VALUES ($1, NULL, 'BILLING', 'Tenant B private announcement', NULL)`,
      [TENANT_B]
    );
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Notification" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Notification" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  test('rejects with no session (401)', async () => {
    const res = await GET(buildRequest('http://localhost/api/notifications', {}));
    expect(res.status).toBe(401);
  });

  test('returns personal + tenant-wide notifications, excluding those addressed to a different user', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/notifications', { cookie: await sessionCookieHeader(TENANT_A, USER_A) })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const titles = body.notifications.map((n: { title: string }) => n.title);
    expect(titles).toContain('Personal reminder for user A');
    expect(titles).toContain('Tenant-wide announcement');
    expect(titles).not.toContain('Addressed to a different user');
    expect(body.unread_count).toBe(2);
  });

  test("never returns another tenant's notifications", async () => {
    const res = await GET(
      buildRequest('http://localhost/api/notifications', { cookie: await sessionCookieHeader(TENANT_A, USER_A) })
    );
    const body = await res.json();
    const titles = body.notifications.map((n: { title: string }) => n.title);
    expect(titles).not.toContain('Tenant B private announcement');
  });
});
