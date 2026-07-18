import { NextResponse } from 'next/server';
import { DatabaseClient } from '@/lib/db/db-client';
import { verifyPassword } from '@/lib/auth/password';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS } from '@/lib/auth/session-cookie';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { getClientIdentifier } from '@/lib/security/rate-limit';
import { checkDistributedRateLimit } from '@/lib/security/redis-rate-limit';

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string | null;
}

const LOGIN_RATE_LIMIT_MAX = 10;
const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * NCHQ Module 9: Auth Session Endpoint
 * Real credential validation against the "User" table. Deliberately returns
 * the same generic error for an unknown email and a wrong password, to
 * avoid leaking which one it was (user enumeration).
 */
export async function POST(request: Request) {
  try {
    const rateLimit = await checkDistributedRateLimit(
      `login:${getClientIdentifier(request)}`,
      LOGIN_RATE_LIMIT_MAX,
      LOGIN_RATE_LIMIT_WINDOW_MS
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    // Tenant-agnostic lookup: the tenant isn't known until we find the user.
    const db = new DatabaseClient();
    const rows = await db.executeSystem<UserRow>(
      `SELECT id, tenant_id, email, password_hash FROM "User" WHERE email = $1`,
      [email]
    );
    const user = rows[0];

    const passwordValid = await verifyPassword(password, user?.password_hash);
    if (!user || !passwordValid) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const token = await signSessionToken({
      sub: user.id,
      tenantId: user.tenant_id,
      email: user.email,
    });

    // No sensitive metadata returned to client — session lives in the
    // httpOnly cookie only.
    const response = NextResponse.json({ authenticated: true }, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'AUTH_FAILED' }, { status: 401 });
  }
}
