import { NextResponse } from 'next/server';
import { DatabaseClient } from '@/lib/db/db-client';
import { MessagingClient } from '@nextcase/messaging';
import { normalizePhoneNumber, maskPhoneNumber } from '@/lib/auth/phone';
import { generateOtp, hashOtp } from '@/lib/auth/otp';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { getClientIdentifier } from '@/lib/security/rate-limit';
import { checkDistributedRateLimit } from '@/lib/security/redis-rate-limit';
import { logSecurityEvent } from '@/lib/audit/logger';

const OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS) || 300; // 5 minutes

// Per-phone: enough for a genuine resend/retry, not enough for meaningful
// provider-cost abuse. Per-IP: the same class of guard as the password
// login route's LOGIN_RATE_LIMIT_MAX, wider because one IP legitimately
// covers many phone numbers (a shared office connection, for example).
const PHONE_RATE_LIMIT_MAX = 5;
const PHONE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const IP_RATE_LIMIT_MAX = 15;
const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
// Resend cooldown — its own tighter, shorter window on the same phone key,
// so "5 requests per 15 minutes" can't all land back-to-back.
const RESEND_COOLDOWN_MAX = 1;
const RESEND_COOLDOWN_WINDOW_MS = 30 * 1000;

const GENERIC_SENT_MESSAGE = 'If this number can receive verification messages, a verification code has been sent.';

/**
 * NCHQ Phone OTP Authentication — OTP Request.
 * Never touches the "User" table: proving control of a phone number and
 * resolving it to an account are deliberately separate steps (see
 * /api/auth/otp/verify, and the locked spec's "User Resolution" section) —
 * so this endpoint's response can never reveal whether a phone number is
 * associated with an account.
 */
export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    const clientId = getClientIdentifier(request);
    const ipLimit = await checkDistributedRateLimit(`otp-request-ip:${clientId}`, IP_RATE_LIMIT_MAX, IP_RATE_LIMIT_WINDOW_MS);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    const rawPhone = typeof body?.phoneNumber === 'string' ? body.phoneNumber : '';
    const phoneNumber = normalizePhoneNumber(rawPhone);
    if (!phoneNumber) {
      return NextResponse.json({ success: false, message: 'Enter a valid phone number.' }, { status: 400 });
    }

    const cooldown = await checkDistributedRateLimit(
      `otp-request-cooldown:${phoneNumber}`,
      RESEND_COOLDOWN_MAX,
      RESEND_COOLDOWN_WINDOW_MS
    );
    if (!cooldown.allowed) {
      return NextResponse.json(
        { success: false, message: 'Please wait before requesting another code.' },
        { status: 429, headers: { 'Retry-After': String(cooldown.retryAfterSeconds) } }
      );
    }

    const phoneLimit = await checkDistributedRateLimit(
      `otp-request-phone:${phoneNumber}`,
      PHONE_RATE_LIMIT_MAX,
      PHONE_RATE_LIMIT_WINDOW_MS
    );
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(phoneLimit.retryAfterSeconds) } }
      );
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

    const db = new DatabaseClient();
    // Supersede any still-active challenge for this phone number before
    // issuing a new one — only the newest challenge is ever valid.
    await db.executeSystem(
      `UPDATE "OtpChallenge" SET consumed_at = now(), updated_at = now() WHERE phone_number = $1 AND consumed_at IS NULL`,
      [phoneNumber]
    );
    await db.executeSystem(
      `INSERT INTO "OtpChallenge" (phone_number, otp_hash, expires_at) VALUES ($1, $2, $3)`,
      [phoneNumber, otpHash, expiresAt.toISOString()]
    );

    try {
      await new MessagingClient().send('SMS', phoneNumber, `Your NextCaseHQ verification code is ${otp}. It expires in 5 minutes.`);
    } catch (err) {
      await logSecurityEvent({ action: 'OTP_PROVIDER_FAILED', phoneNumber: maskPhoneNumber(phoneNumber) });
      return NextResponse.json(
        { success: false, message: "We couldn't send a verification code right now. Please try again." },
        { status: 502 }
      );
    }

    await logSecurityEvent({ action: 'OTP_REQUESTED', phoneNumber: maskPhoneNumber(phoneNumber) });

    return NextResponse.json({ success: true, message: GENERIC_SENT_MESSAGE }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
