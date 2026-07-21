import { NextResponse } from 'next/server';
import { DatabaseClient } from '@/lib/db/db-client';
import { normalizePhoneNumber, maskPhoneNumber } from '@/lib/auth/phone';
import { verifyOtp } from '@/lib/auth/otp';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS } from '@/lib/auth/session-cookie';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { getClientIdentifier } from '@/lib/security/rate-limit';
import { checkDistributedRateLimit } from '@/lib/security/redis-rate-limit';
import { logSecurityEvent } from '@/lib/audit/logger';

const MAX_ATTEMPTS = 5;
const VERIFY_RATE_LIMIT_MAX = 10;
const VERIFY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const GENERIC_INVALID_MESSAGE = 'The verification code is invalid or has expired.';

interface ChallengeRow {
  id: string;
  otp_hash: string;
  expires_at: string;
  attempt_count: number;
}

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  phone_verified_at: string | null;
}

/**
 * NCHQ Phone OTP Authentication — OTP Verify.
 * Mints the exact same session token/cookie as POST /api/auth/session
 * (password login) — one trusted session shape, so proxy.ts, requireSession,
 * and every existing session-consuming route work unchanged regardless of
 * which method the advocate signed in with.
 */
export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const rawPhone = typeof body?.phoneNumber === 'string' ? body.phoneNumber : '';
    const otp = typeof body?.otp === 'string' ? body.otp.trim() : '';
    const phoneNumber = normalizePhoneNumber(rawPhone);

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, message: GENERIC_INVALID_MESSAGE }, { status: 401 });
    }

    const clientId = getClientIdentifier(request);
    const rateLimit = await checkDistributedRateLimit(
      `otp-verify:${phoneNumber}:${clientId}`,
      VERIFY_RATE_LIMIT_MAX,
      VERIFY_RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: GENERIC_INVALID_MESSAGE },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const db = new DatabaseClient();
    const challenges = await db.executeSystem<ChallengeRow>(
      `SELECT id, otp_hash, expires_at, attempt_count FROM "OtpChallenge"
       WHERE phone_number = $1 AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [phoneNumber]
    );
    const challenge = challenges[0];

    if (!challenge || new Date(challenge.expires_at) < new Date() || challenge.attempt_count >= MAX_ATTEMPTS) {
      await logSecurityEvent({ action: 'OTP_FAILED', phoneNumber: maskPhoneNumber(phoneNumber) });
      return NextResponse.json({ success: false, message: GENERIC_INVALID_MESSAGE }, { status: 401 });
    }

    await db.executeSystem(
      `UPDATE "OtpChallenge" SET attempt_count = attempt_count + 1, updated_at = now() WHERE id = $1`,
      [challenge.id]
    );

    const otpValid = await verifyOtp(otp, challenge.otp_hash);
    if (!otpValid) {
      await logSecurityEvent({ action: 'OTP_FAILED', phoneNumber: maskPhoneNumber(phoneNumber) });
      return NextResponse.json({ success: false, message: GENERIC_INVALID_MESSAGE }, { status: 401 });
    }

    await db.executeSystem(`UPDATE "OtpChallenge" SET consumed_at = now(), updated_at = now() WHERE id = $1`, [
      challenge.id,
    ]);

    // Proving control of the phone number is not the same as having an
    // account — see the spec's "User Resolution" section. No account with
    // this phone number is never distinguished from a wrong/expired code.
    const users = await db.executeSystem<UserRow>(
      `SELECT id, tenant_id, email, phone_verified_at FROM "User" WHERE phone_number = $1`,
      [phoneNumber]
    );
    const user = users[0];
    if (!user) {
      await logSecurityEvent({ action: 'OTP_FAILED', phoneNumber: maskPhoneNumber(phoneNumber) });
      return NextResponse.json({ success: false, message: GENERIC_INVALID_MESSAGE }, { status: 401 });
    }

    if (!user.phone_verified_at) {
      await db.executeSystem(`UPDATE "User" SET phone_verified_at = now() WHERE id = $1`, [user.id]);
    }

    const token = await signSessionToken({ sub: user.id, tenantId: user.tenant_id, email: user.email });

    await logSecurityEvent({ action: 'OTP_VERIFIED', phoneNumber: maskPhoneNumber(phoneNumber) });
    await logSecurityEvent({ action: 'SESSION_CREATED', userId: user.id, tenantId: user.tenant_id });

    const response = NextResponse.json({ success: true, authenticated: true }, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, message: GENERIC_INVALID_MESSAGE }, { status: 401 });
  }
}
