import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { signAdminSessionToken } from '@/lib/security/admin-session';
import { DEMO_MATTER_ID } from '@/lib/beta/demo-data';

function buildDashboardRequest(cookieValue?: string, path = '/dashboard/cases'): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${cookieValue}`;
  }
  return new NextRequest(new URL(`http://localhost${path}`), { headers });
}

function buildApiRequest(path: string, options: { method?: string; cookieValue?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.cookieValue !== undefined) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${options.cookieValue}`;
  }
  return new NextRequest(new URL(`http://localhost${path}`), {
    method: options.method ?? 'GET',
    headers,
  });
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

describe('middleware — Beta Preview (BETA_PREVIEW_ENABLED)', () => {
  const originalFlag = process.env.BETA_PREVIEW_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.BETA_PREVIEW_ENABLED;
    } else {
      process.env.BETA_PREVIEW_ENABLED = originalFlag;
    }
  });

  test('disabled by default: bare /dashboard still redirects to /login with no session', async () => {
    delete process.env.BETA_PREVIEW_ENABLED;
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('disabled by default: GET /api/matters/{demo id} is not intercepted with a demo payload', async () => {
    delete process.env.BETA_PREVIEW_ENABLED;
    const response = await middleware(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('enabled + no session: bare /dashboard is allowed through (no redirect)', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('enabled + no session: /dashboard sub-routes still redirect to /login', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard/ai-chamber'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('enabled + no session: GET /api/matters/{demo id} returns the static demo Matter', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const response = await middleware(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matter.is_demo).toBe(true);
    expect(body.matter.id).toBe(DEMO_MATTER_ID);
  });

  test('enabled + no session: GET /api/matters (list) returns exactly the one demo Matter with beta_preview: true', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const response = await middleware(buildApiRequest('/api/matters'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.beta_preview).toBe(true);
    expect(body.matters).toHaveLength(1);
    expect(body.matters[0].id).toBe(DEMO_MATTER_ID);
  });

  test('enabled + no session: GET for any other Matter ID is NOT intercepted (falls through to the real route)', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const otherMatterId = '11111111-1111-4111-8111-111111111111';
    const response = await middleware(buildApiRequest(`/api/matters/${otherMatterId}`));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('enabled + WITH a valid session: GET /api/matters/{demo id} is NOT intercepted — real, signed-in requests always reach the real route', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const token = await signSessionToken({
      sub: '00000000-0000-4000-8000-00000000000e',
      tenantId: '00000000-0000-4000-8000-00000000000f',
      email: 'middleware-test@nextcase.local',
    });
    const response = await middleware(
      buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`, { cookieValue: token })
    );
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('enabled + no session: write methods (e.g. PATCH) to the demo Matter are NEVER intercepted', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const response = await middleware(
      buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`, { method: 'PATCH' })
    );
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('disabled by default: GET /api/beta-status is not intercepted (no real route backs it, so it 404s downstream)', async () => {
    delete process.env.BETA_PREVIEW_ENABLED;
    const response = await middleware(buildApiRequest('/api/beta-status'));
    const body = await response.json().catch(() => null);
    expect(body?.enabled).not.toBe(true);
  });

  test('enabled + no session: GET /api/beta-status reports enabled: true, so pages can swap auth wording for neutral beta wording', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const response = await middleware(buildApiRequest('/api/beta-status'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
  });

  test('enabled + WITH a valid session: GET /api/beta-status is NOT intercepted (irrelevant for signed-in users, who never hit the auth wall)', async () => {
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const token = await signSessionToken({
      sub: '00000000-0000-4000-8000-00000000000e',
      tenantId: '00000000-0000-4000-8000-00000000000f',
      email: 'middleware-test@nextcase.local',
    });
    const response = await middleware(buildApiRequest('/api/beta-status', { cookieValue: token }));
    const body = await response.json().catch(() => null);
    expect(body?.enabled).not.toBe(true);
  });
});
