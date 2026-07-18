import { NextRequest } from 'next/server';
import { POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

const TENANT_A = '00000000-0000-4000-8000-0000000000a1';
const TENANT_B = '00000000-0000-4000-8000-0000000000b1';
const USER_ID = '00000000-0000-4000-8000-00000000009a';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({
    sub: USER_ID,
    tenantId,
    email: 'upload-test@nextcase.local',
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/upload'), {
    method: 'POST',
    headers,
    body: 'file-bytes',
  });
}

describe('POST /api/documents/upload — server-enforced tenant authorization', () => {
  test('rejects requests with no session cookie (401)', async () => {
    const req = buildRequest({ 'x-tenant-key-version': 'v1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('rejects requests with an invalid/garbage session cookie (401)', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: `${SESSION_COOKIE_NAME}=not-a-real-jwt`,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('processes the upload under the session tenant, ignoring a spoofed x-nextcase-tenant-id header', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-nextcase-tenant-id': TENANT_B,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.tenant_id).toBe(TENANT_A);
    expect(body.tenant_id).not.toBe(TENANT_B);
  });

  test('processes the upload under the session tenant, ignoring a spoofed x-tenant-id header', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-tenant-id': TENANT_B,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.tenant_id).toBe(TENANT_A);
  });

  test('a session for a different tenant produces a different resolved tenant_id (no cross-tenant bleed)', async () => {
    const reqA = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
    });
    const reqB = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_B),
    });
    const [bodyA, bodyB] = await Promise.all([
      POST(reqA).then((r) => r.json()),
      POST(reqB).then((r) => r.json()),
    ]);
    expect(bodyA.tenant_id).toBe(TENANT_A);
    expect(bodyB.tenant_id).toBe(TENANT_B);
  });

  test('still requires x-tenant-key-version (400) even when authenticated', async () => {
    const req = buildRequest({ cookie: await sessionCookieHeader(TENANT_A) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
