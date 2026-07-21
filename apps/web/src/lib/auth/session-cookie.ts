/**
 * Shared between the session/logout route handlers and proxy.ts so
 * they all agree on the same cookie name/lifetime. No imports — safe for
 * any runtime.
 */
export const SESSION_COOKIE_NAME = 'NEXTCASE_SESSION';
// Matches the JWT's own expiry (see lib/auth/jwt.ts's SESSION_TTL_SECONDS) —
// same env var, so the cookie can never outlive (or expire before) the
// token it carries. Defaults to ~30 days per the Phone OTP Authentication
// spec's session lifetime requirement.
export const SESSION_COOKIE_MAX_AGE_SECONDS = Number(process.env.SESSION_TTL_SECONDS) || 60 * 60 * 24 * 30;
