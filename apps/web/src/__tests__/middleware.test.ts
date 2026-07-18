import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { signAdminSessionToken } from '@/lib/security/admin-session';

function buildDashboardRequest(cookieValue?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${cookieValue}`;
  }
  return new NextRequest(new URL('http://localhost/dashboard/cases'), { headers });
}

function buildAdminApiRequest(tokenCookieValue?: string, path = '/api/admin/health'): NextRequest {
  const headers: Record<string, string> = {};
  if (tokenCookieValue !== undefined) {
    headers.cookie = `NEXTCASE_ADMIN_TOKEN=${tokenCookieValue}`;
  }
  return new NextRequest(new URL(`http://localhost${path}`), { headers });
}

describe('middleware — protected /dashboard routes', () => {
  test('redirects to /login when there is no session cookie', async () => {
    const response = await middleware(buildDashboardRequest());
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('redirects to /login when the session cookie is invalid', async () => {
    const response = await middleware(buildDashboardRequest('not-a-real-jwt'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('allows the request through with a validly signed session cookie', async () => {
    const token = await signSessionToken({
      sub: '00000000-0000-4000-8000-00000000000e',
      tenantId: '00000000-0000-4000-8000-00000000000f',
      email: 'middleware-test@nextcase.local',
    });
    const response = await middleware(buildDashboardRequest(token));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });
});

describe('middleware — /api/admin gate', () => {
  test('rejects a request with no admin session cookie', async () => {
    const response = await middleware(buildAdminApiRequest());
    expect(response.status).toBe(401);
  });

  test('rejects a request with a token that is not a validly signed admin session (e.g. a guessed/forged string)', async () => {
    const response = await middleware(buildAdminApiRequest('totally-wrong-token'));
    expect(response.status).toBe(401);
  });

  test('allows a request with a validly signed admin session token minted by POST /api/admin/session', async () => {
    const token = await signAdminSessionToken();
    const response = await middleware(buildAdminApiRequest(token));
    expect(response.status).not.toBe(401);
  });

  test('lets POST /api/admin/session through with no cookie at all — it authorizes itself', async () => {
    const response = await middleware(buildAdminApiRequest(undefined, '/api/admin/session'));
    expect(response.status).not.toBe(401);
  });

  test('lets POST /api/admin/logout through with no cookie at all — it authorizes itself', async () => {
    const response = await middleware(buildAdminApiRequest(undefined, '/api/admin/logout'));
    expect(response.status).not.toBe(401);
  });
});
