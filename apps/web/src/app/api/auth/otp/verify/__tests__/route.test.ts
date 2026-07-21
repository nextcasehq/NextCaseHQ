import { jwtVerify } from 'jose';
import { POST } from '../route';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { hashOtp } from '@/lib/auth/otp';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { __resetRateLimitForTests } from '@/lib/security/rate-limit';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'nchq-secret-placeholder');
const TRUSTED_ORIGIN = 'http://localhost:3000';
const PHONE = '+919876500011';
const OTP = '123456';

function buildRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: TRUSTED_ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}

function getSessionCookieValue(response: Response): string | undefined {
  const setCookie = response.headers.get('set-cookie') || '';
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match?.[1];
}

async function seedChallenge(db: DatabaseClient, overrides: Partial<{ expiresAt: Date; attemptCount: number; consumed: boolean }> = {}) {
  const otpHash = await hashOtp(OTP);
  const expiresAt = overrides.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000);
  await db.executeSystem(`DELETE FROM "OtpChallenge" WHERE phone_number = $1`, [PHONE]);
  await db.executeSystem(
    `INSERT INTO "OtpChallenge" (phone_number, otp_hash, expires_at, attempt_count, consumed_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [PHONE, otpHash, expiresAt.toISOString(), overrides.attemptCount ?? 0, overrides.consumed ? new Date().toISOString() : null]
  );
}

describe('POST /api/auth/otp/verify', () => {
  const db = new DatabaseClient();
  const TENANT_ID = '00000000-0000-4000-8000-0000000000e1';
  let userId: string;

  beforeAll(async () => {
    await db.executeSystem(`INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_ID,
      'OTP Verify Route Test Tenant',
    ]);
    const rows = await db.executeSystem<{ id: string }>(
      `INSERT INTO "User" (tenant_id, email, name, phone_number)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, phone_number = EXCLUDED.phone_number
       RETURNING id`,
      [TENANT_ID, 'otp-route-test-user@nextcase.local', 'OTP Route Test User', PHONE]
    );
    userId = rows[0].id;
  });

  afterAll(async () => {
    await db.executeSystem(`DELETE FROM "OtpChallenge" WHERE phone_number = $1`, [PHONE]);
    await db.executeSystem(`DELETE FROM "User" WHERE phone_number = $1`, [PHONE]);
    await db.executeSystem(`DELETE FROM "Tenant" WHERE id = $1`, [TENANT_ID]);
    await closePool();
  });

  beforeEach(() => {
    __resetRateLimitForTests();
  });

  test('the correct code for an existing user mints a session cookie carrying that user/tenant', async () => {
    await seedChallenge(db);
    const response = await POST(buildRequest({ phoneNumber: PHONE, otp: OTP }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, authenticated: true });

    const token = getSessionCookieValue(response)!;
    expect(token).toBeTruthy();
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.sub).toBe(userId);
    expect(payload.tenantId).toBe(TENANT_ID);
  });

  test('marks phone_verified_at the first time a phone number is successfully verified', async () => {
    const rows = await db.executeSystem<{ phone_verified_at: string | null }>(
      `SELECT phone_verified_at FROM "User" WHERE id = $1`,
      [userId]
    );
    expect(rows[0].phone_verified_at).not.toBeNull();
  });

  test('a consumed challenge can never be verified again (replay prevention)', async () => {
    const response = await POST(buildRequest({ phoneNumber: PHONE, otp: OTP }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ success: false, message: 'The verification code is invalid or has expired.' });
  });

  test('a wrong code returns the same generic invalid/expired message as an expired code', async () => {
    await seedChallenge(db);
    const response = await POST(buildRequest({ phoneNumber: PHONE, otp: '000000' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('The verification code is invalid or has expired.');
  });

  test('an expired challenge is rejected even with the correct code', async () => {
    await seedChallenge(db, { expiresAt: new Date(Date.now() - 60 * 1000) });
    const response = await POST(buildRequest({ phoneNumber: PHONE, otp: OTP }));
    expect(response.status).toBe(401);
  });

  test('a challenge that already exhausted its attempt budget is rejected even with the correct code', async () => {
    await seedChallenge(db, { attemptCount: 5 });
    const response = await POST(buildRequest({ phoneNumber: PHONE, otp: OTP }));
    expect(response.status).toBe(401);
  });

  test('a correct code for a phone number with no matching User account is rejected with the same generic message (no enumeration)', async () => {
    const otherPhone = '+919876500012';
    const otpHash = await hashOtp(OTP);
    await db.executeSystem(
      `INSERT INTO "OtpChallenge" (phone_number, otp_hash, expires_at) VALUES ($1, $2, $3)`,
      [otherPhone, otpHash, new Date(Date.now() + 5 * 60 * 1000).toISOString()]
    );
    const response = await POST(buildRequest({ phoneNumber: otherPhone, otp: OTP }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('The verification code is invalid or has expired.');
    await db.executeSystem(`DELETE FROM "OtpChallenge" WHERE phone_number = $1`, [otherPhone]);
  });

  test('rejects a request from an untrusted origin (CSRF defense)', async () => {
    const response = await POST(buildRequest({ phoneNumber: PHONE, otp: OTP }, { origin: 'https://attacker.example' }));
    expect(response.status).toBe(403);
  });

  test('missing otp or phoneNumber returns the generic invalid message without throwing', async () => {
    const response = await POST(buildRequest({ phoneNumber: PHONE }));
    expect(response.status).toBe(401);
  });
});
