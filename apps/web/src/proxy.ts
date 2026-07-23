import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/security/admin-session';
import { isProductReviewModeEnabled, matchProductReviewRoute, matchPublicPreviewRoute } from '@/lib/beta/demo-data';

/**
 * NCHQ Module 9: Secure Multi-Tenant API Gateway (Proxy, formerly Middleware)
 *
 * Renamed from middleware.ts / `export function middleware` to proxy.ts /
 * `export function proxy` per the Next.js 16 rename (the `middleware`
 * filename and export are deprecated in favor of `proxy` — see the v16
 * upgrade guide). The old middleware.ts was silently never invoked under
 * Next.js 16.2.10, which meant dashboard/admin route protection, the API
 * bearer-token gate, and Product Review Mode's demo-data mocking were all
 * inert. This file's logic is unchanged; only the filename and exported
 * function name moved. Proxy always runs on the nodejs runtime (unlike
 * middleware, which could opt into edge) — nothing here required edge.
 *
 * Static security headers (CSP, HSTS, etc.) are applied globally via
 * next.config.ts's headers(), not here — they don't depend on anything
 * request-specific, so there's no need to route them through proxy or
 * widen this file's matcher to cover pages it otherwise has no reason
 * to touch.
 */

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'nchq-secret-placeholder');

export async function proxy(request: NextRequest) {
  const start = performance.now();
  const pathname = request.nextUrl.pathname;

  // 0. Enforce zero-trust admin API gate. /api/admin/session (mints/checks
  // the session) and /api/admin/logout (clears it) authorize themselves —
  // see apps/web/src/app/api/admin/session/route.ts — so they're reachable
  // without an existing admin session cookie, same pattern as the
  // self-authorized routes in section 2 below. Every other /api/admin/*
  // route requires a signed session token minted by that login endpoint.
  if (pathname.startsWith('/api/admin')) {
    const isSelfAuthorizedAdminRoute =
      pathname.startsWith('/api/admin/session') || pathname.startsWith('/api/admin/logout');
    if (isSelfAuthorizedAdminRoute) {
      return NextResponse.next();
    }

    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!adminToken || !(await verifyAdminSessionToken(adminToken))) {
      return new NextResponse(
        JSON.stringify({ error: 'SECURE_ACCESS_DENIED', message: 'Unauthorized administrative session.' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    return NextResponse.next();
  }

  // 0.6. Protect the /admin console page itself (distinct from /api/admin,
  // handled in section 0 above) with the same server-verified admin
  // session cookie. Previously this page had no edge-level protection at
  // all — authorization was enforced only for its data (every /api/admin/*
  // call), while the page shell itself was reachable by anyone; it also
  // used to embed its own separate credential-entry form. There is no
  // dedicated /login page (removed — Phone OTP sign-in is a separate,
  // not-yet-implemented milestone), so an unauthenticated visitor is sent
  // to the public landing page instead of a dead route; the console
  // itself stays fully locked regardless of where they land.
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!adminToken || !(await verifyAdminSessionToken(adminToken))) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 0.55. Always-on public preview (independent of PRODUCT_REVIEW_MODE —
  // never gated behind any env var, so it cannot be silently inactive in
  // a deployment). Serves the small, fixed set of synthetic GET responses
  // the explicitly-approved public-view allowlist (Legal Search,
  // Document Creator/manual drafting's Matter dropdown) needs to actually
  // function for an unauthenticated visitor — see
  // matchPublicPreviewRoute in lib/beta/demo-data.ts for the exact,
  // reserved path list. Only GET, only with no session cookie at all;
  // every write route and every other GET falls through unchanged.
  if (request.method === 'GET' && !request.cookies.get(SESSION_COOKIE_NAME)?.value) {
    const publicPreviewPayload = matchPublicPreviewRoute(pathname, request.nextUrl.searchParams);
    if (publicPreviewPayload !== undefined) {
      return NextResponse.json(publicPreviewPayload, { status: 200 });
    }
  }

  // 0.57. Protect the /audit console page — no real audit data is exposed
  // here yet, but this stays behind the same real-session gate as every
  // other non-public-preview page rather than being reachable by default.
  if (pathname.startsWith('/audit')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    let hasValidSession = false;
    if (sessionToken) {
      try {
        await jwtVerify(sessionToken, JWT_SECRET);
        hasValidSession = true;
      } catch {
        hasValidSession = false;
      }
    }
    if (!hasValidSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 0.5. Product Review Mode — opt-in only (PRODUCT_REVIEW_MODE=true;
  // secure-by-default, off otherwise): serve a broader set of static,
  // non-sensitive demo GET responses to unauthenticated visitors — the
  // Ask AI Action Card, AI Credits & Usage page, and one synthetic
  // Matter's (DEMO_MATTER_ID) sub-resources — without ever reaching the
  // database or the real route handler. Only GET, only with no session
  // cookie at all, and only this exact reserved set of paths; every write
  // route and every other GET (including any other matter_id) is
  // completely untouched and falls through to the checks below exactly
  // as before. This is explicit, operator-controlled configuration for a
  // manual review session — never a global default; see the
  // "ARCHITECTURAL CORRECTION" to the "PRIORITY CHANGE — MAKE NEXTCASEHQ
  // VIEWABLE BY PRODUCT OWNER" milestone. Formerly gated by
  // BETA_PREVIEW_ENABLED — that variable is no longer read anywhere in
  // this file.
  if (
    isProductReviewModeEnabled() &&
    request.method === 'GET' &&
    !request.cookies.get(SESSION_COOKIE_NAME)?.value
  ) {
    const demoPayload = matchProductReviewRoute(pathname, request.nextUrl.searchParams);
    if (demoPayload !== undefined) {
      return NextResponse.json(demoPayload, { status: 200 });
    }
  }

  // 1. Protect authenticated dashboard pages with the real session cookie
  // minted by POST /api/auth/session. Tenant-authorization enforcement
  // (does this user's tenant match what they're accessing) is a separate,
  // later milestone — this only proves "is there a validly signed session".
  if (pathname.startsWith('/dashboard')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    let hasValidSession = false;
    if (sessionToken) {
      try {
        await jwtVerify(sessionToken, JWT_SECRET);
        hasValidSession = true;
      } catch {
        hasValidSession = false;
      }
    }
    if (!hasValidSession) {
      // Always-on public-view allowlist (independent of PRODUCT_REVIEW_MODE
      // — never gated behind any env var): the bare launch page (the
      // public product-navigation entry point the landing page's own
      // "Access Active Chamber" link and every other public route link
      // into), Document Creator/manual drafting (draft-builder), and the
      // approved synthetic Matter Register preview (/dashboard/matters and
      // its [matterId] detail page, which embeds the demo eCourts Case
      // Status interface). None of these fetch real tenant data:
      // draft-builder and the Matter Register prototype are 100%
      // client-side mock content (local/session storage / hardcoded
      // fixtures) with no backend calls at all; the bare launch page's own
      // network calls are all served by the always-on preview data above
      // or degrade to an empty, non-erroring state.
      const ALWAYS_PUBLIC_DASHBOARD_PATHS = new Set(['/dashboard', '/dashboard/draft-builder', '/dashboard/matters']);
      const isAlwaysPublicDashboardPage =
        ALWAYS_PUBLIC_DASHBOARD_PATHS.has(pathname) || pathname.startsWith('/dashboard/matters/');

      // Product Review Mode exemption — opt-in only (PRODUCT_REVIEW_MODE=
      // true): additionally exposes the Ask AI Action Card and the AI
      // Credits & Usage page for an operator-initiated manual review
      // session. Never active by default; AI Credits stays locked unless
      // an operator explicitly turns this on.
      const PRODUCT_REVIEW_DASHBOARD_PATHS = new Set([
        '/dashboard',
        '/dashboard/ai-chamber',
        '/dashboard/draft-builder',
        '/dashboard/matters',
        '/dashboard/credits',
      ]);
      const isProductReviewExemptPage =
        (PRODUCT_REVIEW_DASHBOARD_PATHS.has(pathname) || pathname.startsWith('/dashboard/matters/')) &&
        isProductReviewModeEnabled();

      // Every other /dashboard/* sub-route (cases, search, audit, evidence,
      // settings, ai-chamber/credits when the opt-in flag is off) still
      // requires a real session and redirects as before — this is a
      // narrow, explicit allowlist, not a blanket exemption.
      if (!isAlwaysPublicDashboardPage && !isProductReviewExemptPage) {
        // No dedicated /login page exists (removed — Phone OTP sign-in is
        // a separate, not-yet-implemented milestone) — send unauthenticated
        // visitors to the public landing page rather than a dead route.
        // The sub-route itself stays fully protected either way; only the
        // redirect target changed.
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Only intercept /api/* routes (excluding auth, and excluding routes
  // that verify their own request authenticity — see
  // apps/web/src/lib/auth/session.ts and
  // apps/web/src/lib/security/webhook-signature.ts. /api/documents,
  // /api/cases, /api/matters, and /api/clients authorize themselves via the
  // real session cookie; /api/webhooks authorizes itself via HMAC request
  // signatures. Gating any of these here too would require a second,
  // disconnected Bearer-token credential that nothing in the app actually
  // issues, effectively making the route unreachable.
  const isSelfAuthorizedApiRoute =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/documents') ||
    pathname.startsWith('/api/cases') ||
    pathname.startsWith('/api/matters') ||
    pathname.startsWith('/api/clients') ||
    pathname.startsWith('/api/search') ||
    pathname.startsWith('/api/judgments') ||
    pathname.startsWith('/api/wallet') ||
    pathname.startsWith('/api/notifications') ||
    pathname.startsWith('/api/ai') ||
    pathname.startsWith('/api/billing') ||
    pathname.startsWith('/api/webhooks');
  if (!pathname.startsWith('/api/all') && (!pathname.startsWith('/api/') || isSelfAuthorizedApiRoute)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse(
      JSON.stringify({ error: 'SECURE_ACCESS_DENIED', message: 'Missing or invalid token.' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    const token = authHeader.split(' ')[1];

    // Verify JWT at the Edge
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const tenantId = payload.tenantId as string;

    // Strict UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!tenantId || !uuidRegex.test(tenantId)) {
      throw new Error('INVALID_TENANT_ID');
    }

    // Inject verified tenant ID into a secure custom header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nextcase-tenant-id', tenantId);

    // NCHQ Module 19: Zero-Trust Sanitization
    requestHeaders.delete('authorization');

    const end = performance.now();
    const duration = end - start;

    // Performance Budget Check: < 5ms
    if (duration > 5) {
      console.warn(`[EDGE_GATEWAY] Middleware performance budget exceeded: ${duration.toFixed(2)}ms`);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: 'SECURE_ACCESS_DENIED', message: 'Unauthorized access attempt.' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }
}

// Match api routes, dashboard routes, admin console routes, and the audit page
export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/admin/:path*', '/audit/:path*'],
};
