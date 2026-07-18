/**
 * A nonce+'strict-dynamic' CSP (the pattern Next.js's App Router docs
 * recommend) was tried first and reverted after real browser testing: it
 * only works for dynamically-rendered pages. This app is
 * static-generation-heavy (most routes are prerendered at build time,
 * before any request/nonce exists), so a fresh per-request nonce from
 * middleware can never match what's baked into that static HTML — every
 * script gets blocked and the app stops working. Forcing all pages to
 * dynamic rendering to fix that would be an architecture/performance
 * change, out of scope for this milestone.
 *
 * Instead: script-src 'self' 'unsafe-inline'. This is honestly weaker —
 * it cannot block inline-script injection the way a nonce could — but it
 * still blocks loading scripts from any external/attacker-controlled
 * origin (a real, meaningful restriction versus no CSP at all), and
 * every other directive here (object-src, frame-ancestors, base-uri,
 * form-action, default-src) applies with full effect regardless. Verified
 * against a real running server + headless Chromium with zero console
 * errors and confirmed hydration, unlike the nonce-based version this
 * replaced.
 */
export function buildContentSecurityPolicy(): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];
  return directives.join('; ');
}

export const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['Content-Security-Policy', buildContentSecurityPolicy()],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'],
];
