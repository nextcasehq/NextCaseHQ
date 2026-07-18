import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

function buildDashboardRequest(cookieValue?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${cookieValue}`;
  }
  return new NextRequest(new URL('http://localhost/dashboard/cases'), { headers });
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
