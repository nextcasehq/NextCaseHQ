import { NextResponse } from 'next/server';
import { INSECURE_ADMIN_TOKEN_PLACEHOLDER } from '@/lib/security/env-validation';
import { constantTimeEqual } from '@/lib/security/constant-time';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_MAX_AGE_SECONDS,
  signAdminSessionToken,
  verifyAdminSessionToken,
} from '@/lib/security/admin-session';

const ADMIN_ACCESS_TOKEN = process.env.ADMIN_ACCESS_TOKEN || INSECURE_ADMIN_TOKEN_PLACEHOLDER;

const ADMIN_LOGIN_RATE_LIMIT_MAX = 10;
const ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * NCHQ: Server-Verified Admin Authentication.
 *
 * Replaces the admin console's former client-side "type the secret key and
 * write your own cookie" flow. The secret itself (ADMIN_ACCESS_TOKEN) is
 * unchanged from PR #63 — this endpoint is what was missing: a real
 * server-side check of that secret, followed by a signed, httpOnly session
 * cookie the client can no longer read or forge (see
 * lib/security/admin-session.ts). middleware.ts's /api/admin/* gate verifies
 * that signed token instead of comparing a raw shared secret.
 */
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `admin-login:${getClientIdentifier(request)}`,
    ADMIN_LOGIN_RATE_LIMIT_MAX,
    ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { authorized: false, error: 'RATE_LIMITED', message: 'Too many admin sign-in attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ authorized: false, error: 'INVALID_ORIGIN' }, { status: 403 });
  }

  let accessKey = '';
  try {
    const body = await request.json();
    accessKey = typeof body?.accessKey === 'string' ? body.accessKey : '';
  } catch {
    return NextResponse.json({ authorized: false, error: 'INVALID_REQUEST' }, { status: 400 });
  }

  if (!accessKey || !constantTimeEqual(accessKey, ADMIN_ACCESS_TOKEN)) {
    return NextResponse.json(
      { authorized: false, error: 'INVALID_ADMINISTRATIVE_SECRET_KEY' },
      { status: 401 }
    );
  }

  const token = await signAdminSessionToken();
  const response = NextResponse.json({ authorized: true }, { status: 200 });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

/** Lets the admin console page ask "am I authorized" without reading the (now httpOnly) cookie itself. */
export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`));
  const token = match ? match.slice(ADMIN_SESSION_COOKIE_NAME.length + 1) : '';

  if (!token) {
    return NextResponse.json({ authorized: false }, { status: 200 });
  }

  const authorized = await verifyAdminSessionToken(token);
  return NextResponse.json({ authorized }, { status: 200 });
}
