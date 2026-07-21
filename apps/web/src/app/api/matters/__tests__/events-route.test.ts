import { NextRequest } from 'next/server';
import { GET, POST } from '../[id]/events/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000101';
const TENANT_B = '00000000-0000-4000-8000-000000000102';
const USER_ID = '00000000-0000-4000-8000-000000000103';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'matter-events-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

describe('GET/POST /api/matters/[id]/events — Matter chronology', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Events Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matter Events Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
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

  test('rejects POST with no session (401)', async () => {
    const matterId = await createMatter(TENANT_A);
    const req = new NextRequest(`http://localhost/api/matters/${matterId}/events`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: JSON.stringify({ event_date: '2026-01-15', description: 'Filed notice' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(401);
  });

  test('rejects an invalid payload (400)', async () => {
    const matterId = await createMatter(TENANT_A);
    const req = new NextRequest(`http://localhost/api/matters/${matterId}/events`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ event_date: 'not-a-date', description: 'Filed notice' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(400);
  });

  test('returns 404 when the matter belongs to another tenant (FK-bypasses-RLS re-verification)', async () => {
    const matterId = await createMatter(TENANT_B);
    const req = new NextRequest(`http://localhost/api/matters/${matterId}/events`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ event_date: '2026-01-15', description: 'Attempted cross-tenant write' }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(404);
  });

  test('creates an event with source_type MANUAL and lists it back for the same tenant', async () => {
    const matterId = await createMatter(TENANT_A);
    const createRes = await POST(
      new NextRequest(`http://localhost/api/matters/${matterId}/events`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
        body: JSON.stringify({ event_date: '2026-01-15', description: 'Filed notice' }),
      }),
      { params: Promise.resolve({ id: matterId }) }
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.event.source_type).toBe('MANUAL');

    const listRes = await GET(
      new NextRequest(`http://localhost/api/matters/${matterId}/events`, {
        headers: { cookie: await sessionCookieHeader(TENANT_A) },
      }),
      { params: Promise.resolve({ id: matterId }) }
    );
    const listBody = await listRes.json();
    expect(listBody.events).toHaveLength(1);
    expect(listBody.events[0].description).toBe('Filed notice');
  });

  test('events for a matter are not visible from another tenant session', async () => {
    const matterId = await createMatter(TENANT_A);
    await POST(
      new NextRequest(`http://localhost/api/matters/${matterId}/events`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
        body: JSON.stringify({ event_date: '2026-01-15', description: 'Private to tenant A' }),
      }),
      { params: Promise.resolve({ id: matterId }) }
    );

    const listRes = await GET(
      new NextRequest(`http://localhost/api/matters/${matterId}/events`, {
        headers: { cookie: await sessionCookieHeader(TENANT_B) },
      }),
      { params: Promise.resolve({ id: matterId }) }
    );
    const listBody = await listRes.json();
    expect(listBody.events).toHaveLength(0);
  });
});
