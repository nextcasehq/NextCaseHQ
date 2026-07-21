/**
 * Validates the `returnTo` destination used by the Phone OTP flow (a
 * protected route redirects to /verify-phone?returnTo=<original path>, and
 * a successful verification redirects back). Shared by proxy.ts (building
 * the redirect to /verify-phone) and /verify-phone itself (redirecting back
 * after verification) so both enforce the same rule — never trust it as an
 * absolute URL, which is exactly how an open redirect happens.
 */

export const RETURN_TO_FALLBACK = '/dashboard';

/**
 * Only an internal, same-origin path is ever returned — anything else
 * (an absolute URL, a protocol-relative "//host" URL, or a backslash-based
 * bypass some browsers treat as an equivalent of "//") falls back to
 * RETURN_TO_FALLBACK instead.
 */
export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value) return RETURN_TO_FALLBACK;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return RETURN_TO_FALLBACK;
  }
  return value;
}
