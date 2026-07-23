import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '44444444-4444-4444-8444-444444444444';
const TENANT_B = '55555555-5555-4555-8555-555555555555';
const USER_ID = '66666666-6666-4666-8666-666666666666';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'court-data-report-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown, query?: string): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/court-data-reports${query ?? ''}`), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST/GET /api/court-data-reports — "Can\'t find your court?" review queue', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Court Data Report Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Court Data Report Test Tenant B',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
      USER_ID,
      TENANT_A,
      'court-data-report-author@nextcase.local',
    ]);
  });

  afterAll(async () => {
    await closePool();
  });

  test('POST rejects with no session (401)', async () => {
    const res = await POST(buildRequest('POST', {}, { court_name: 'Munsiff Court, Kollam' }));
    expect(res.status).toBe(401);
  });

  test('POST rejects an untrusted origin (403)', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }, {
        court_name: 'Munsiff Court, Kollam',
      })
    );
    expect(res.status).toBe(403);
  });

  test('POST rejects an empty court_name (400)', async () => {
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { court_name: '' }));
    expect(res.status).toBe(400);
  });

  test('POST creates a report defaulting to OPEN status, with only court_name required', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { court_name: 'Munsiff Court, Kollam' })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.court_data_report.court_name).toBe('Munsiff Court, Kollam');
    expect(body.court_data_report.status).toBe('OPEN');
    expect(body.court_data_report.state).toBeNull();
  });

  test('POST stores the full structured context when provided', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, {
        court_system_id: 'district-courts',
        state: 'Kerala',
        district: 'Kollam',
        court_establishment: 'Munsiff Court, Kollam',
        court_name: 'Munsiff Court, Kollam',
        comments: 'This court is missing from the Kollam list.',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.court_data_report.state).toBe('Kerala');
    expect(body.court_data_report.district).toBe('Kollam');
    expect(body.court_data_report.comments).toBe('This court is missing from the Kollam list.');
  });

  test('GET rejects with no session (401)', async () => {
    const res = await GET(buildRequest('GET', {}));
    expect(res.status).toBe(401);
  });

  test("GET returns only the caller tenant's reports (RLS)", async () => {
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_B) }, { court_name: 'Tenant B court note.' })
    );
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.court_data_reports.some((r: { court_name: string }) => r.court_name === 'Tenant B court note.')).toBe(
      false
    );
  });

  test('GET filters by status', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?status=OPEN'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.court_data_reports.length).toBeGreaterThan(0);
    expect(body.court_data_reports.every((r: { status: string }) => r.status === 'OPEN')).toBe(true);
  });
});
