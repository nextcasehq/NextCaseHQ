import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

/**
 * NCHQ Module 9: Secure Multi-Tenant API Gateway (Edge Middleware)
 */

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'nchq-secret-placeholder');

export async function middleware(request: NextRequest) {
  const start = performance.now();
  const pathname = request.nextUrl.pathname;

  // 0. Enforce zero-trust admin API gate
  if (pathname.startsWith('/api/admin')) {
    const adminToken = request.cookies.get('NEXTCASE_ADMIN_TOKEN')?.value;
    if (adminToken !== 'nchq-admin-secret-key-2026') {
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
  // apps/web/src/lib/security/webhook-signature.ts. /api/documents/upload
  // authorizes itself via the real session cookie; /api/webhooks
  // authorizes itself via HMAC request signatures. Gating either here too
  // would require a second, disconnected Bearer-token credential that
  // nothing in the app actually issues, effectively making the route
  // unreachable.
  const isSelfAuthorizedApiRoute =
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/api/documents/upload') ||
    request.nextUrl.pathname.startsWith('/api/webhooks');
  if (!request.nextUrl.pathname.startsWith('/api/all') && (!request.nextUrl.pathname.startsWith('/api/') || isSelfAuthorizedApiRoute)) {
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
