import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';
import { POST } from '../route';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { __resetRateLimitForTests } from '@/lib/security/rate-limit';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'nchq-secret-placeholder');
const TRUSTED_ORIGIN = 'http://localhost:3000';

function buildRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: TRUSTED_ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetRateLimitForTests();
});

function getSessionCookieValue(response: Response): string | undefined {
  const setCookie = response.headers.get('set-cookie') || '';
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match?.[1];
}

describe('POST /api/auth/session — real credential validation', () => {
  const db = new DatabaseClient();
  const TENANT_ID = '00000000-0000-4000-8000-0000000000d1';
  const EMAIL = 'route-test-user@nextcase.local';
  const PASSWORD = 'correct-horse-battery-staple';
  let userId: string;

  beforeAll(async () => {
    await db.executeSystem(
      `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'Session Route Test Tenant']
    );
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const rows = await db.executeSystem<{ id: string }>(
      `INSERT INTO "User" (tenant_id, email, name, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, tenant_id = EXCLUDED.tenant_id
       RETURNING id`,
      [TENANT_ID, EMAIL, 'Route Test User', passwordHash]
    );
    userId = rows[0].id;
  });

  afterAll(async () => {
    await db.executeSystem(`DELETE FROM "User" WHERE email = $1`, [EMAIL]);
    await db.executeSystem(`DELETE FROM "Tenant" WHERE id = $1`, [TENANT_ID]);
    await closePool();
  });

  test('valid credentials return 200 and set a signed session cookie', async () => {
    const response = await POST(buildRequest({ email: EMAIL, password: PASSWORD }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ authenticated: true });

    const cookieValue = getSessionCookieValue(response);
    expect(cookieValue).toBeTruthy();
  });

  test('session cookie carries the correct tenant association', async () => {
    const response = await POST(buildRequest({ email: EMAIL, password: PASSWORD }));
    const token = getSessionCookieValue(response)!;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.sub).toBe(userId);
    expect(payload.tenantId).toBe(TENANT_ID);
    expect(payload.email).toBe(EMAIL);
  });

  test('invalid password returns 401 with a generic error', async () => {
    const response = await POST(buildRequest({ email: EMAIL, password: 'wrong-password' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'INVALID_CREDENTIALS' });
    expect(getSessionCookieValue(response)).toBeFalsy();
  });

  test('unknown user returns the same 401/error shape as a wrong password (no user enumeration)', async () => {
    const response = await POST(buildRequest({ email: 'no-such-user@nextcase.local', password: 'anything' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'INVALID_CREDENTIALS' });
    expect(getSessionCookieValue(response)).toBeFalsy();
  });

  test('missing password field returns 401 without throwing', async () => {
    const response = await POST(buildRequest({ email: EMAIL }));
    expect(response.status).toBe(401);
  });

  test('rejects a request from an untrusted origin (CSRF defense) even with correct credentials', async () => {
    const response = await POST(
      buildRequest({ email: EMAIL, password: PASSWORD }, { origin: 'https://attacker.example' })
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('INVALID_ORIGIN');
  });

  test('rate-limits repeated login attempts from the same client', async () => {
    const clientHeaders = { 'x-forwarded-for': '203.0.113.42' };
    let lastResponse!: Response;
    for (let i = 0; i < 11; i++) {
      lastResponse = await POST(buildRequest({ email: EMAIL, password: 'wrong' }, clientHeaders));
    }
    expect(lastResponse.status).toBe(429);
    expect(lastResponse.headers.get('Retry-After')).toBeTruthy();
  });
});
