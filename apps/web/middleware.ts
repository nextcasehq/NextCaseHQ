import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * NCHQ Module 9: Secure Multi-Tenant API Gateway (Edge Middleware)
 */

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'nchq-secret-placeholder');

export async function middleware(request: NextRequest) {
  const start = performance.now();
  const pathname = request.nextUrl.pathname;

  // 1. Protect /admin routes using NEXTCASE_ADMIN_TOKEN
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('NEXTCASE_ADMIN_TOKEN')?.value || request.headers.get('x-nextcase-admin-token');
    const expectedToken = process.env.NEXTCASE_ADMIN_TOKEN || 'nchq-admin-super-token-placeholder';

    // If an expected token is configured and the user's token does not match, redirect or block access
    if (adminToken !== expectedToken && process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/login?error=ADMIN_ACCESS_DENIED', request.url));
    }
    return NextResponse.next();
  }

  // 2. Only intercept /api/* routes (excluding auth)
  if (!pathname.startsWith('/api/all') && (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth'))) {
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
