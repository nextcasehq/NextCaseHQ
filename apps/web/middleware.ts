import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/security/admin-session';

/**
 * NCHQ Module 9: Secure Multi-Tenant API Gateway (Edge Middleware)
 *
 * Static security headers (CSP, HSTS, etc.) are applied globally via
 * next.config.ts's headers(), not here — they don't depend on anything
 * request-specific, so there's no need to route them through middleware
 * or widen this file's matcher to cover pages it otherwise has no reason
 * to touch.
 */

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'nchq-secret-placeholder');

export async function middleware(request: NextRequest) {
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

  // 1. Protect authenticated dashboard pages with the real session cookie
  // minted by POST /api/auth/session. Tenant-authorization enforcement
  // (does this user's tenant match what they're accessing) is a separate,
  // later milestone — this only proves "is there a validly signed session".
  if (pathname.startsWith('/dashboard')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      await jwtVerify(sessionToken, JWT_SECRET);
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
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

// Match api routes, dashboard routes, and admin console routes
export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/admin/:path*'],
};
