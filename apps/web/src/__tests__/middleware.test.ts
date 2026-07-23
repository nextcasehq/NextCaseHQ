import { NextRequest } from 'next/server';
import { proxy } from '../proxy';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { signAdminSessionToken } from '@/lib/security/admin-session';
import { DEMO_MATTER_ID, DEMO_DOCUMENT_ID } from '@/lib/beta/demo-data';

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

function buildAuditRequest(cookieValue?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${cookieValue}`;
  }
  return new NextRequest(new URL('http://localhost/audit'), { headers });
}

const sessionToken = () =>
  signSessionToken({
    sub: '00000000-0000-4000-8000-00000000000e',
    tenantId: '00000000-0000-4000-8000-00000000000f',
    email: 'middleware-test@nextcase.local',
  });

describe('middleware — protected /dashboard routes (non-allowlisted sub-routes)', () => {
  test('redirects to the landing page (never the deleted /login route) when there is no session cookie', async () => {
    const response = await proxy(buildDashboardRequest());
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).not.toContain('/login');
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  test('redirects to the landing page (never the deleted /login route) when the session cookie is invalid', async () => {
    const response = await proxy(buildDashboardRequest('not-a-real-jwt'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).not.toContain('/login');
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  test('allows the request through with a validly signed session cookie', async () => {
    const token = await sessionToken();
    const response = await proxy(buildDashboardRequest(token));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });
});

describe('middleware — /api/admin gate', () => {
  test('rejects a request with no admin session cookie', async () => {
    const response = await proxy(buildAdminApiRequest());
    expect(response.status).toBe(401);
  });

  test('rejects a request with a token that is not a validly signed admin session (e.g. a guessed/forged string)', async () => {
    const response = await proxy(buildAdminApiRequest('totally-wrong-token'));
    expect(response.status).toBe(401);
  });

  test('allows a request with a validly signed admin session token minted by POST /api/admin/session', async () => {
    const token = await signAdminSessionToken();
    const response = await proxy(buildAdminApiRequest(token));
    expect(response.status).not.toBe(401);
  });

  test('lets POST /api/admin/session through with no cookie at all — it authorizes itself', async () => {
    const response = await proxy(buildAdminApiRequest(undefined, '/api/admin/session'));
    expect(response.status).not.toBe(401);
  });

  test('lets POST /api/admin/logout through with no cookie at all — it authorizes itself', async () => {
    const response = await proxy(buildAdminApiRequest(undefined, '/api/admin/logout'));
    expect(response.status).not.toBe(401);
  });
});

describe('middleware — protected /admin console page (no dedicated login page)', () => {
  test('redirects to the landing page (never the deleted /login route) when there is no admin session cookie', async () => {
    const response = await proxy(buildAdminApiRequest(undefined, '/admin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).not.toContain('/login');
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  test('redirects to the landing page (never the deleted /login route) when the admin session cookie is invalid', async () => {
    const response = await proxy(buildAdminApiRequest('not-a-real-admin-jwt', '/admin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).not.toContain('/login');
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  test('allows the request through with a validly signed admin session cookie', async () => {
    const token = await signAdminSessionToken();
    const response = await proxy(buildAdminApiRequest(token, '/admin'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });
});

describe('middleware — protected /audit page', () => {
  test('redirects to the landing page (never the deleted /login route) when there is no session cookie', async () => {
    const response = await proxy(buildAuditRequest());
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).not.toContain('/login');
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  test('redirects to the landing page when the session cookie is invalid', async () => {
    const response = await proxy(buildAuditRequest('not-a-real-jwt'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  test('allows the request through with a validly signed session cookie', async () => {
    const token = await sessionToken();
    const response = await proxy(buildAuditRequest(token));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });
});

describe('middleware — always-on public preview (independent of PRODUCT_REVIEW_MODE, never globally default-active for anything beyond this fixed set)', () => {
  const originalFlag = process.env.PRODUCT_REVIEW_MODE;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.PRODUCT_REVIEW_MODE;
    } else {
      process.env.PRODUCT_REVIEW_MODE = originalFlag;
    }
  });

  test('PRODUCT_REVIEW_MODE is opt-in, secure-by-default: unset reads as disabled', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    // The legacy opt-in surface (DEMO_MATTER_ID sub-resources) must NOT be
    // reachable merely because the env var is unset.
    const response = await proxy(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('bare /dashboard is allowed through with no session, regardless of PRODUCT_REVIEW_MODE', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    const withoutFlag = await proxy(buildDashboardRequest(undefined, '/dashboard'));
    expect(withoutFlag.status).not.toBe(307);
    process.env.PRODUCT_REVIEW_MODE = 'false';
    const explicitlyOff = await proxy(buildDashboardRequest(undefined, '/dashboard'));
    expect(explicitlyOff.status).not.toBe(307);
  });

  test('/dashboard/draft-builder (Document Creator/manual drafting) is allowed through with no session, regardless of PRODUCT_REVIEW_MODE', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'false';
    const response = await proxy(buildDashboardRequest(undefined, '/dashboard/draft-builder'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('/dashboard/matters and /dashboard/matters/[matterId] (synthetic Matter Register preview) are allowed through with no session, regardless of PRODUCT_REVIEW_MODE', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'false';
    const list = await proxy(buildDashboardRequest(undefined, '/dashboard/matters'));
    expect(list.status).not.toBe(307);
    const detail = await proxy(buildDashboardRequest(undefined, '/dashboard/matters/mock-matter-001'));
    expect(detail.status).not.toBe(307);
  });

  test('every other /dashboard sub-route still redirects, never to /login (narrow allowlist, not a blanket exemption)', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'false';
    for (const path of [
      '/dashboard/cases',
      '/dashboard/search',
      '/dashboard/audit',
      '/dashboard/evidence',
      '/dashboard/settings',
      '/dashboard/ai-chamber',
      '/dashboard/credits',
    ]) {
      const response = await proxy(buildDashboardRequest(undefined, path));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).not.toContain('/login');
      expect(new URL(response.headers.get('location')!).pathname).toBe('/');
    }
  });

  test('GET /api/beta-status always reports enabled: true with no session, regardless of PRODUCT_REVIEW_MODE', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'false';
    const response = await proxy(buildApiRequest('/api/beta-status'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
  });

  test('GET /api/beta-status is NOT intercepted with a valid session', async () => {
    const token = await sessionToken();
    const response = await proxy(buildApiRequest('/api/beta-status', { cookieValue: token }));
    const body = await response.json().catch(() => null);
    expect(body?.enabled).not.toBe(true);
  });

  test('GET /api/matters (list) always returns exactly the one demo Matter with no session, regardless of PRODUCT_REVIEW_MODE', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'false';
    const response = await proxy(buildApiRequest('/api/matters'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.review_mode).toBe(true);
    expect(body.matters).toHaveLength(1);
    expect(body.matters[0].id).toBe(DEMO_MATTER_ID);
  });

  test('GET /api/matters?status=ACTIVE (matching the demo Matter\'s own status) still returns it', async () => {
    const response = await proxy(buildApiRequest('/api/matters?status=ACTIVE'));
    const body = await response.json();
    expect(body.matters).toHaveLength(1);
  });

  test('GET /api/matters?status=CLOSED (not the demo Matter\'s status) returns no matters', async () => {
    const response = await proxy(buildApiRequest('/api/matters?status=CLOSED'));
    const body = await response.json();
    expect(body.matters).toHaveLength(0);
  });

  test('GET /api/matters is NOT intercepted with a valid session — real, signed-in requests always reach the real route', async () => {
    const token = await sessionToken();
    const response = await proxy(buildApiRequest('/api/matters', { cookieValue: token }));
    const body = await response.json().catch(() => null);
    expect(body?.review_mode).not.toBe(true);
  });

  test('GET /api/matters/{demo id} (a specific matter, not the list) is NOT part of the always-on surface — falls through', async () => {
    const response = await proxy(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('write methods (e.g. PATCH) to /api/matters are NEVER intercepted', async () => {
    const response = await proxy(buildApiRequest('/api/matters', { method: 'PATCH' }));
    const body = await response.json().catch(() => null);
    expect(body?.review_mode).not.toBe(true);
  });

  test('GET /api/search (Legal Search interface) always returns the synthetic legal dataset with no session, regardless of PRODUCT_REVIEW_MODE', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'false';
    const response = await proxy(buildApiRequest('/api/search?q=contract'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.review_mode).toBe(true);
    const allItems = body.groups.flatMap((g: { items: unknown[] }) => g.items);
    expect(allItems.length).toBeGreaterThan(0);
    expect(allItems.every((item: { is_demo?: boolean }) => item.is_demo)).toBe(true);
  });

  test('GET /api/search with an unmatched query returns empty groups (no results), not an error', async () => {
    const response = await proxy(buildApiRequest('/api/search?q=zzzznonexistentqueryzzzz'));
    expect(response.status).toBe(200);
    const body = await response.json();
    const allItems = body.groups.flatMap((g: { items: unknown[] }) => g.items);
    expect(allItems).toHaveLength(0);
  });

  test('GET /api/search is NOT intercepted with a valid session — real, signed-in requests always reach the real Search Service', async () => {
    const token = await sessionToken();
    const response = await proxy(buildApiRequest('/api/search?q=contract', { cookieValue: token }));
    const body = await response.json().catch(() => null);
    expect(body?.review_mode).not.toBe(true);
  });

  test('POST /api/search (hypothetical write) is never intercepted', async () => {
    const response = await proxy(buildApiRequest('/api/search?q=contract', { method: 'POST' }));
    const body = await response.json().catch(() => null);
    expect(body?.review_mode).not.toBe(true);
  });

  test('GET /api/judgments/search is NOT intercepted by the legacy Bearer-token gate — it authorizes itself via the real session cookie, same as /api/search', async () => {
    // Regression: any /api/* route not added to isSelfAuthorizedApiRoute
    // falls through to a Bearer-token check nothing in this app actually
    // issues, making the route unreachable even with a real, valid
    // session cookie (caught via live Playwright verification when this
    // route was first built — the route handler's own requireSession()
    // was correct, but requests never reached it).
    const token = await sessionToken();
    const response = await proxy(buildApiRequest('/api/judgments/search?q=contract', { cookieValue: token }));
    expect(response.status).not.toBe(401);
    const body = await response.json().catch(() => null);
    expect(body?.message).not.toBe('Missing or invalid token.');
  });

  test('GET /api/judgments/search with no session at all is not blocked by the middleware itself — the route handler enforces auth (and returns its own 401)', async () => {
    const response = await proxy(buildApiRequest('/api/judgments/search?q=contract'));
    // The middleware passes it through either way; only the /api/judgments
    // self-authorized allowlist entry is under test here, not the route
    // handler's own requireSession() (covered by
    // app/api/judgments/search/__tests__/route.test.ts).
    const body = await response.json().catch(() => null);
    expect(body?.message).not.toBe('Missing or invalid token.');
  });

  test('GET /api/search/demo/{a real demo id} returns that item with no session, regardless of PRODUCT_REVIEW_MODE', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'false';
    const response = await proxy(buildApiRequest('/api/search/demo/demo-act-0001'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.id).toBe('demo-act-0001');
  });

  test('GET /api/search/demo/{unknown id} is not intercepted (falls through, no fabricated content)', async () => {
    const response = await proxy(buildApiRequest('/api/search/demo/does-not-exist'));
    const body = await response.json().catch(() => null);
    expect(body?.result).toBeUndefined();
  });
});

describe('middleware — Product Review Mode, opt-in only (PRODUCT_REVIEW_MODE=true; secure by default otherwise)', () => {
  const originalFlag = process.env.PRODUCT_REVIEW_MODE;
  const originalLegacyFlag = process.env.BETA_PREVIEW_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.PRODUCT_REVIEW_MODE;
    } else {
      process.env.PRODUCT_REVIEW_MODE = originalFlag;
    }
    if (originalLegacyFlag === undefined) {
      delete process.env.BETA_PREVIEW_ENABLED;
    } else {
      process.env.BETA_PREVIEW_ENABLED = originalLegacyFlag;
    }
  });

  test('security regression: the retired BETA_PREVIEW_ENABLED variable has no effect at all, even set to "true" — only PRODUCT_REVIEW_MODE is read', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    process.env.BETA_PREVIEW_ENABLED = 'true';
    const response = await proxy(buildDashboardRequest(undefined, '/dashboard/ai-chamber'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).not.toContain('/login');
  });

  test('disabled by default: unset PRODUCT_REVIEW_MODE keeps /dashboard/ai-chamber and /dashboard/credits locked', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    for (const path of ['/dashboard/ai-chamber', '/dashboard/credits']) {
      const response = await proxy(buildDashboardRequest(undefined, path));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/');
    }
  });

  test('disabled by default: GET /api/matters/{demo id} and its sub-resources are not intercepted', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    const response = await proxy(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('disabled by default: GET /api/documents/{demo document id} is not intercepted', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    const response = await proxy(buildApiRequest(`/api/documents/${DEMO_DOCUMENT_ID}`));
    const body = await response.json().catch(() => null);
    expect(body?.document?.is_demo).not.toBe(true);
  });

  test('enabled + no session: /dashboard/ai-chamber (Ask AI Action Card destination) is allowed through, no redirect', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await proxy(buildDashboardRequest(undefined, '/dashboard/ai-chamber'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('enabled + no session: /dashboard/credits (AI Credits & Usage page) is allowed through, no redirect', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await proxy(buildDashboardRequest(undefined, '/dashboard/credits'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('enabled + no session: GET /api/matters/{demo id} returns the static demo Matter', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await proxy(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matter.is_demo).toBe(true);
    expect(body.matter.id).toBe(DEMO_MATTER_ID);
  });

  test('enabled + no session: GET for any other Matter ID is NOT intercepted (falls through to the real route)', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const otherMatterId = '11111111-1111-4111-8111-111111111111';
    const response = await proxy(buildApiRequest(`/api/matters/${otherMatterId}`));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('enabled + WITH a valid session: GET /api/matters/{demo id} is NOT intercepted — real, signed-in requests always reach the real route', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const token = await sessionToken();
    const response = await proxy(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`, { cookieValue: token }));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('enabled + no session: write methods (e.g. PATCH) to the demo Matter are NEVER intercepted', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await proxy(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`, { method: 'PATCH' }));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('enabled + no session: GET /api/documents/{demo document id} returns the static demo Document', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await proxy(buildApiRequest(`/api/documents/${DEMO_DOCUMENT_ID}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.document.id).toBe(DEMO_DOCUMENT_ID);
    expect(body.document.matter_id).toBe(DEMO_MATTER_ID);
  });
});
