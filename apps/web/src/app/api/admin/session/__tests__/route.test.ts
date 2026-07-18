import { POST, GET } from '../route';
import { INSECURE_ADMIN_TOKEN_PLACEHOLDER } from '@/lib/security/env-validation';
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/security/admin-session';
import { __resetRateLimitForTests } from '@/lib/security/rate-limit';

const TRUSTED_ORIGIN = 'http://localhost:3000';

function buildPostRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: TRUSTED_ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}

function buildGetRequest(cookieValue?: string): Request {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers.cookie = `${ADMIN_SESSION_COOKIE_NAME}=${cookieValue}`;
  }
  return new Request('http://localhost/api/admin/session', { headers });
}

function getSetCookieValue(response: Response): string | undefined {
  const setCookie = response.headers.get('set-cookie') || '';
  const match = setCookie.match(new RegExp(`${ADMIN_SESSION_COOKIE_NAME}=([^;]*)`));
  return match?.[1];
}

beforeEach(() => {
  __resetRateLimitForTests();
});

describe('POST /api/admin/session — server-verified admin login', () => {
  test('the correct secret key returns 200, authorized:true, and a signed session cookie', async () => {
    const response = await POST(buildPostRequest({ accessKey: INSECURE_ADMIN_TOKEN_PLACEHOLDER }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ authorized: true });

    const cookieValue = getSetCookieValue(response);
    expect(cookieValue).toBeTruthy();
    expect(await verifyAdminSessionToken(cookieValue!)).toBe(true);
  });

  test('an incorrect secret key returns 401, authorized:false, and no cookie', async () => {
    const response = await POST(buildPostRequest({ accessKey: 'not-the-real-secret' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.authorized).toBe(false);
    expect(getSetCookieValue(response)).toBeFalsy();
  });

  test('the legacy UI-only bypass string "admin" is no longer accepted', async () => {
    const response = await POST(buildPostRequest({ accessKey: 'admin' }));
    expect(response.status).toBe(401);
  });

  test('a missing accessKey field returns 401', async () => {
    const response = await POST(buildPostRequest({}));
    expect(response.status).toBe(401);
  });

  test('rejects a request from an untrusted origin even with the correct secret', async () => {
    const response = await POST(
      buildPostRequest({ accessKey: INSECURE_ADMIN_TOKEN_PLACEHOLDER }, { origin: 'https://attacker.example' })
    );
    expect(response.status).toBe(403);
  });

  test('rate-limits repeated admin login attempts from the same client', async () => {
    const clientHeaders = { 'x-forwarded-for': '203.0.113.77' };
    let lastResponse!: Response;
    for (let i = 0; i < 11; i++) {
      lastResponse = await POST(buildPostRequest({ accessKey: 'wrong' }, clientHeaders));
    }
    expect(lastResponse.status).toBe(429);
    expect(lastResponse.headers.get('Retry-After')).toBeTruthy();
  });
});

describe('GET /api/admin/session — check for an existing admin session', () => {
  test('no cookie at all returns authorized:false', async () => {
    const response = await GET(buildGetRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ authorized: false });
  });

  test('a garbage cookie value returns authorized:false', async () => {
    const response = await GET(buildGetRequest('not-a-real-token'));
    const body = await response.json();
    expect(body).toEqual({ authorized: false });
  });

  test('a session minted by a successful POST verifies as authorized:true', async () => {
    __resetRateLimitForTests();
    const loginResponse = await POST(buildPostRequest({ accessKey: INSECURE_ADMIN_TOKEN_PLACEHOLDER }));
    const cookieValue = getSetCookieValue(loginResponse)!;

    const response = await GET(buildGetRequest(cookieValue));
    const body = await response.json();
    expect(body).toEqual({ authorized: true });
  });
});
