import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
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

describe('middleware — protected /admin console page (single login entry point)', () => {
  test('redirects to /login when there is no admin session cookie', async () => {
    const response = await middleware(buildAdminApiRequest(undefined, '/admin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('redirects to /login when the admin session cookie is invalid', async () => {
    const response = await middleware(buildAdminApiRequest('not-a-real-admin-jwt', '/admin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('allows the request through with a validly signed admin session cookie', async () => {
    const token = await signAdminSessionToken();
    const response = await middleware(buildAdminApiRequest(token, '/admin'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });
});

describe('middleware — Product Review Mode (PRODUCT_REVIEW_MODE)', () => {
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
    const dashboardResponse = await middleware(buildDashboardRequest(undefined, '/dashboard'));
    expect(dashboardResponse.status).toBe(307);
    expect(dashboardResponse.headers.get('location')).toContain('/login');

    const mattersResponse = await middleware(buildApiRequest('/api/matters'));
    const mattersBody = await mattersResponse.json().catch(() => null);
    expect(mattersBody?.review_mode).not.toBe(true);

    const searchResponse = await middleware(buildApiRequest('/api/search?q=contract'));
    const searchBody = await searchResponse.json().catch(() => null);
    expect(searchBody?.review_mode).not.toBe(true);
  });

  test('disabled by default: bare /dashboard still redirects to /login with no session', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  test('disabled by default: GET /api/matters/{demo id} is not intercepted with a demo payload', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    const response = await middleware(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('enabled + no session: bare /dashboard is allowed through (no redirect)', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('enabled + no session: /dashboard/ai-chamber (Ask AI Action Card destination) is allowed through, no redirect', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard/ai-chamber'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('enabled + no session: /dashboard/draft-builder (Draft Document Action Card destination) is allowed through, no redirect', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard/draft-builder'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('enabled + no session: every other /dashboard sub-route still redirects to /login (narrow allowlist, not a blanket exemption)', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    for (const path of ['/dashboard/cases', '/dashboard/search', '/dashboard/audit', '/dashboard/evidence', '/dashboard/settings']) {
      const response = await middleware(buildDashboardRequest(undefined, path));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    }
  });

  test('enabled + no session: /dashboard/matters (Matter Register prototype list) is allowed through, no redirect', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard/matters'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('enabled + no session: /dashboard/matters/[matterId] (Matter Register prototype detail) is allowed through, no redirect', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard/matters/mock-matter-001'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('enabled + no session: /dashboard/credits (AI Credits & Usage page) is allowed through, no redirect', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildDashboardRequest(undefined, '/dashboard/credits'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  test('disabled by default: /dashboard/ai-chamber, /dashboard/draft-builder, /dashboard/matters, and /dashboard/credits still redirect to /login (exemption only applies when the flag is on)', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    for (const path of ['/dashboard/ai-chamber', '/dashboard/draft-builder', '/dashboard/matters', '/dashboard/matters/mock-matter-001', '/dashboard/credits']) {
      const response = await middleware(buildDashboardRequest(undefined, path));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    }
  });

  test('enabled + no session: GET /api/matters/{demo id} returns the static demo Matter', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matter.is_demo).toBe(true);
    expect(body.matter.id).toBe(DEMO_MATTER_ID);
  });

  test('enabled + no session: GET /api/matters (list) returns exactly the one demo Matter with review_mode: true', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/matters'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.review_mode).toBe(true);
    expect(body.matters).toHaveLength(1);
    expect(body.matters[0].id).toBe(DEMO_MATTER_ID);
  });

  test('enabled + no session: GET /api/matters?status=ACTIVE (matching the demo Matter\'s own status) still returns it', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/matters?status=ACTIVE'));
    const body = await response.json();
    expect(body.matters).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  test('enabled + no session: GET /api/matters?status=ALL still returns the demo Matter', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/matters?status=ALL'));
    const body = await response.json();
    expect(body.matters).toHaveLength(1);
  });

  test('enabled + no session: GET /api/matters?status=CLOSED (not the demo Matter\'s status) returns no matters, not the demo Matter under the wrong tab', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/matters?status=CLOSED'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.review_mode).toBe(true);
    expect(body.matters).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  test('enabled + no session: GET /api/matters?status=ON_HOLD also returns no matters', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/matters?status=ON_HOLD'));
    const body = await response.json();
    expect(body.matters).toHaveLength(0);
  });

  test('enabled + no session: GET for any other Matter ID is NOT intercepted (falls through to the real route)', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const otherMatterId = '11111111-1111-4111-8111-111111111111';
    const response = await middleware(buildApiRequest(`/api/matters/${otherMatterId}`));
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('enabled + WITH a valid session: GET /api/matters/{demo id} is NOT intercepted — real, signed-in requests always reach the real route', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
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
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(
      buildApiRequest(`/api/matters/${DEMO_MATTER_ID}`, { method: 'PATCH' })
    );
    const body = await response.json().catch(() => null);
    expect(body?.matter?.is_demo).not.toBe(true);
  });

  test('disabled by default: GET /api/beta-status is not intercepted (no real route backs it, so it 404s downstream)', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    const response = await middleware(buildApiRequest('/api/beta-status'));
    const body = await response.json().catch(() => null);
    expect(body?.enabled).not.toBe(true);
  });

  test('enabled + no session: GET /api/beta-status reports enabled: true, so pages can swap auth wording for neutral review wording', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/beta-status'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
  });

  test('enabled + WITH a valid session: GET /api/beta-status is NOT intercepted (irrelevant for signed-in users, who never hit the auth wall)', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const token = await signSessionToken({
      sub: '00000000-0000-4000-8000-00000000000e',
      tenantId: '00000000-0000-4000-8000-00000000000f',
      email: 'middleware-test@nextcase.local',
    });
    const response = await middleware(buildApiRequest('/api/beta-status', { cookieValue: token }));
    const body = await response.json().catch(() => null);
    expect(body?.enabled).not.toBe(true);
  });

  test('disabled by default: GET /api/documents/{demo document id} is not intercepted', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    const response = await middleware(buildApiRequest(`/api/documents/${DEMO_DOCUMENT_ID}`));
    const body = await response.json().catch(() => null);
    expect(body?.document?.is_demo).not.toBe(true);
  });

  test('enabled + no session: GET /api/documents/{demo document id} returns the static demo Document', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest(`/api/documents/${DEMO_DOCUMENT_ID}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.document.id).toBe(DEMO_DOCUMENT_ID);
    expect(body.document.matter_id).toBe(DEMO_MATTER_ID);
  });

  test('disabled by default: GET /api/search is not intercepted with demo results', async () => {
    delete process.env.PRODUCT_REVIEW_MODE;
    const response = await middleware(buildApiRequest('/api/search?q=contract'));
    const body = await response.json().catch(() => null);
    expect(body?.review_mode).not.toBe(true);
  });

  test('enabled + no session: GET /api/search (no matter_id) returns the synthetic legal dataset, matching the query', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/search?q=contract'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.review_mode).toBe(true);
    const allItems = body.groups.flatMap((g: { items: unknown[] }) => g.items);
    expect(allItems.length).toBeGreaterThan(0);
    expect(allItems.every((item: { is_demo?: boolean }) => item.is_demo)).toBe(true);
  });

  test('enabled + no session: GET /api/search with an unmatched query returns empty groups (no results), not an error', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/search?q=zzzznonexistentqueryzzzz'));
    expect(response.status).toBe(200);
    const body = await response.json();
    const allItems = body.groups.flatMap((g: { items: unknown[] }) => g.items);
    expect(allItems).toHaveLength(0);
  });

  test('enabled + no session: GET /api/search scoped to the demo Matter returns the matter-scoped demo fixtures instead of the general dataset', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(
      buildApiRequest(`/api/search?matter_id=${DEMO_MATTER_ID}&q=Acme`)
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.review_mode).toBe(true);
    const groupTypes = body.groups.map((g: { type: string }) => g.type);
    expect(groupTypes).toEqual(expect.arrayContaining(['PROCEEDING', 'DOCUMENT', 'COURT_NOTE']));
    expect(groupTypes).not.toContain('JUDGMENT');
  });

  test('enabled + WITH a valid session: GET /api/search is NOT intercepted — real, signed-in requests always reach the real Search Service', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const token = await signSessionToken({
      sub: '00000000-0000-4000-8000-00000000000e',
      tenantId: '00000000-0000-4000-8000-00000000000f',
      email: 'middleware-test@nextcase.local',
    });
    const response = await middleware(buildApiRequest('/api/search?q=contract', { cookieValue: token }));
    const body = await response.json().catch(() => null);
    expect(body?.review_mode).not.toBe(true);
  });

  test('enabled + no session: POST /api/search (hypothetical write) is never intercepted', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/search?q=contract', { method: 'POST' }));
    const body = await response.json().catch(() => null);
    expect(body?.review_mode).not.toBe(true);
  });

  test('enabled + no session: GET /api/search/demo/{a real demo id} returns that item', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/search/demo/demo-act-0001'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.id).toBe('demo-act-0001');
    expect(body.result.type).toBe('ACT');
  });

  test('enabled + no session: GET /api/search/demo/{unknown id} is not intercepted (falls through, no fabricated content)', async () => {
    process.env.PRODUCT_REVIEW_MODE = 'true';
    const response = await middleware(buildApiRequest('/api/search/demo/does-not-exist'));
    const body = await response.json().catch(() => null);
    expect(body?.result).toBeUndefined();
  });
});
