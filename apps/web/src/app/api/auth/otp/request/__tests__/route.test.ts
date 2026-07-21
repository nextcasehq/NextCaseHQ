import { POST } from '../route';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { __resetRateLimitForTests } from '@/lib/security/rate-limit';

const TRUSTED_ORIGIN = 'http://localhost:3000';
const GENERIC_MESSAGE = 'If this number can receive verification messages, a verification code has been sent.';

function buildRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: TRUSTED_ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetRateLimitForTests();
});

describe('POST /api/auth/otp/request', () => {
  const db = new DatabaseClient();
  const PHONE = '+919876500001';

  afterAll(async () => {
    await db.executeSystem(`DELETE FROM "OtpChallenge" WHERE phone_number = $1`, [PHONE]);
    await closePool();
  });

  test('a valid phone number returns the generic success message and never reveals account existence', async () => {
    const response = await POST(buildRequest({ phoneNumber: PHONE }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, message: GENERIC_MESSAGE });
  });

  test('creates exactly one active (unconsumed) challenge for the phone number', async () => {
    const rows = await db.executeSystem<{ count: string }>(
      `SELECT count(*)::text FROM "OtpChallenge" WHERE phone_number = $1 AND consumed_at IS NULL`,
      [PHONE]
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  test('never stores the OTP in plaintext — otp_hash is not a 6-digit string', async () => {
    const rows = await db.executeSystem<{ otp_hash: string }>(
      `SELECT otp_hash FROM "OtpChallenge" WHERE phone_number = $1 AND consumed_at IS NULL`,
      [PHONE]
    );
    expect(rows[0].otp_hash).not.toMatch(/^\d{6}$/);
  });

  test('a malformed phone number is rejected with a distinct client error (not the generic enumeration-safe message)', async () => {
    const response = await POST(buildRequest({ phoneNumber: 'not-a-phone' }));
    expect(response.status).toBe(400);
  });

  test('rejects a request from an untrusted origin (CSRF defense)', async () => {
    const response = await POST(buildRequest({ phoneNumber: PHONE }, { origin: 'https://attacker.example' }));
    expect(response.status).toBe(403);
  });

  test('enforces a resend cooldown — a second immediate request for the same phone number is rate-limited', async () => {
    const phone = '+919876500002';
    const first = await POST(buildRequest({ phoneNumber: phone }));
    expect(first.status).toBe(200);
    const second = await POST(buildRequest({ phoneNumber: phone }));
    expect(second.status).toBe(429);
    await db.executeSystem(`DELETE FROM "OtpChallenge" WHERE phone_number = $1`, [phone]);
  });

  test('a new request supersedes the previous unconsumed challenge for the same phone number', async () => {
    const phone = '+919876500003';
    await POST(buildRequest({ phoneNumber: phone }));
    // Bypass the resend cooldown directly to test supersession logic itself.
    __resetRateLimitForTests();
    await POST(buildRequest({ phoneNumber: phone }));
    const rows = await db.executeSystem<{ count: string }>(
      `SELECT count(*)::text FROM "OtpChallenge" WHERE phone_number = $1 AND consumed_at IS NULL`,
      [phone]
    );
    expect(Number(rows[0].count)).toBe(1);
    await db.executeSystem(`DELETE FROM "OtpChallenge" WHERE phone_number = $1`, [phone]);
  });
});
