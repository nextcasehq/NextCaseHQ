/**
 * Shared between the session/logout route handlers and middleware.ts so
 * they all agree on the same cookie name/lifetime. No imports — safe for
 * Edge runtime.
 */
export const SESSION_COOKIE_NAME = 'NEXTCASE_SESSION';
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h, matches the JWT's own expiry (see lib/auth/jwt.ts)
