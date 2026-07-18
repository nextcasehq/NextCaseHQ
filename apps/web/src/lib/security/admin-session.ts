import { SignJWT, jwtVerify } from 'jose';

/**
 * Deliberately separate from lib/auth/jwt.ts (regular user sessions): the
 * admin console is a distinct trust boundary with its own secret, so a
 * compromise of one signing key doesn't compromise the other, and this
 * milestone never has to touch the regular user auth code path. Shared
 * with apps/web/middleware.ts, which verifies this same token at the Edge.
 */
const ADMIN_SESSION_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || 'nchq-admin-session-secret-placeholder'
);
const JWT_ALG = 'HS256';
const ADMIN_SESSION_TTL = '24h';

export const ADMIN_SESSION_COOKIE_NAME = 'NEXTCASE_ADMIN_TOKEN';
export const ADMIN_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h, matches the JWT's own expiry

export async function signAdminSessionToken(): Promise<string> {
  return new SignJWT({ role: 'PLATFORM_ADMIN' })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(ADMIN_SESSION_TTL)
    .sign(ADMIN_SESSION_SECRET);
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, ADMIN_SESSION_SECRET);
    return payload.role === 'PLATFORM_ADMIN';
  } catch {
    return false;
  }
}
