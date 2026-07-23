import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'feedback-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown, query?: string): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/feedback${query ?? ''}`), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST/GET /api/feedback — Feedback Centre', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Feedback Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Feedback Test Tenant B',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
      USER_ID,
      TENANT_A,
      'feedback-author@nextcase.local',
    ]);
  });

  afterAll(async () => {
    await closePool();
  });

  test('POST rejects with no session (401)', async () => {
    const res = await POST(buildRequest('POST', {}, { category: 'BUG', message: 'Something broke.' }));
    expect(res.status).toBe(401);
  });

  test('POST rejects an untrusted origin (403)', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }, {
        category: 'BUG',
        message: 'Something broke.',
      })
    );
    expect(res.status).toBe(403);
  });

  test('POST rejects an invalid category (400)', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { category: 'NOT_REAL', message: 'x' })
    );
    expect(res.status).toBe(400);
  });

  test('POST rejects an empty message (400)', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { category: 'BUG', message: '' })
    );
    expect(res.status).toBe(400);
  });

  test('POST creates a feedback row defaulting to OPEN status, with no page_url required', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, {
        category: 'FEATURE_REQUEST',
        message: 'Please add a global task list.',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.feedback.category).toBe('FEATURE_REQUEST');
    expect(body.feedback.status).toBe('OPEN');
    expect(body.feedback.page_url).toBeNull();
  });

  test('POST stores page_url when provided', async () => {
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, {
        category: 'USABILITY',
        message: 'The button is hard to find.',
        page_url: '/matters/some-id',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.feedback.page_url).toBe('/matters/some-id');
  });

  test('GET rejects with no session (401)', async () => {
    const res = await GET(buildRequest('GET', {}));
    expect(res.status).toBe(401);
  });

  test('GET returns only the caller tenant\'s feedback (RLS)', async () => {
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_B) }, { category: 'GENERAL', message: 'Tenant B note.' })
    );
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feedback.every((f: { category: string }) => true)).toBe(true);
    expect(body.feedback.some((f: { message: string }) => f.message === 'Tenant B note.')).toBe(false);
  });

  test('GET filters by category', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, '?category=USABILITY'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feedback.length).toBeGreaterThan(0);
    expect(body.feedback.every((f: { category: string }) => f.category === 'USABILITY')).toBe(true);
  });
});
