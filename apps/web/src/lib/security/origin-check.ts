/**
 * CSRF defense for state-changing, browser-originated routes (login,
 * logout, upload): verifies the Origin (falling back to Referer) header
 * matches an allowlisted origin. This is a standard, well-established
 * complement to the session cookie's SameSite=Strict attribute — the
 * cookie already stops the browser from attaching credentials to a
 * cross-site request in most cases, and this adds an explicit,
 * server-verified check rather than relying on cookie behavior alone.
 *
 * Not applied to /api/webhooks: that route is called by external systems
 * that legitimately have no browser Origin at all, and is protected by
 * HMAC request signatures instead (see webhook-signature.ts) — a
 * stronger, purpose-built guarantee than an Origin check could offer.
 */

const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:3000';

function getAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS;
  if (configured) {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return [DEFAULT_ALLOWED_ORIGIN];
}

export function isTrustedOrigin(request: Request): boolean {
  const allowed = getAllowedOrigins();

  const origin = request.headers.get('origin');
  if (origin) {
    return allowed.includes(origin);
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return allowed.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Neither header present: a same-origin browser request for a
  // state-changing method always sends at least one of these, so their
  // total absence fails closed rather than assuming same-origin.
  return false;
}
