import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '8a5f0e3c-7d2b-4c1a-9e6f-1b2c3d4e5f01';
const TENANT_B = '8a5f0e3c-7d2b-4c1a-9e6f-1b2c3d4e5f02';
const USER_A = '8a5f0e3c-7d2b-4c1a-9e6f-1b2c3d4e5f03';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId, email: 'matter-events-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/matters/placeholder/events'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
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
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'matter-events-author@nextcase.local']
    );
  });

  afterAll(async () => {
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
    const res = await POST(buildRequest({}, 'POST', { event_date: '2026-01-10', description: 'Filed notice' }), routeParams(matterId));
    expect(res.status).toBe(401);
  });

  test('rejects an untrusted origin (403)', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await POST(
      buildRequest(
        { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' },
        'POST',
        { event_date: '2026-01-10', description: 'Filed notice' }
      ),
      routeParams(matterId)
    );
    expect(res.status).toBe(403);
  });

  test('rejects an invalid payload (400)', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { event_date: 'not-a-date', description: 'x' }),
      routeParams(matterId)
    );
    expect(res.status).toBe(400);
  });

  test('creates a MANUAL chronology entry and lists it back', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { event_date: '2026-01-10', description: 'Filed notice' }),
      routeParams(matterId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.event.source_type).toBe('MANUAL');

    const listRes = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(matterId));
    const listBody = await listRes.json();
    expect(listBody.events).toHaveLength(1);
  });

  test('returns 404 for a well-formed but non-existent matter id', async () => {
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { event_date: '2026-01-10', description: 'x' }),
      routeParams(NON_EXISTENT_ID)
    );
    expect(res.status).toBe(404);
  });

  test('events are not visible from another tenant session (RLS)', async () => {
    const matterId = await createMatter(TENANT_A);
    await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { event_date: '2026-01-10', description: 'Private' }),
      routeParams(matterId)
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }), routeParams(matterId));
    const body = await res.json();
    expect(body.events).toHaveLength(0);
  });

  test('rejects adding a chronology entry to a closed matter (409), and inserts nothing', async () => {
    const matterId = await createMatter(TENANT_A);
    await db.execute(TENANT_A, `UPDATE "Matter" SET status = 'CLOSED' WHERE id = $1`, [matterId]);

    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { event_date: '2026-01-10', description: 'Too late' }),
      routeParams(matterId)
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('MATTER_CLOSED_READ_ONLY');

    const rows = await db.execute<{ count: number }>(
      TENANT_A,
      `SELECT COUNT(*)::int AS count FROM "MatterEvent" WHERE matter_id = $1`,
      [matterId]
    );
    expect(rows[0].count).toBe(0);
  });
});
