import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * NCHQ Module 9: Secure Multi-Tenant API Gateway (Edge Middleware)
 */

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'nchq-secret-placeholder');

export async function middleware(request: NextRequest) {
  const start = performance.now();

  // 1. Only intercept /api/* routes (excluding auth)
  if (!request.nextUrl.pathname.startsWith('/api/') || request.nextUrl.pathname.startsWith('/api/auth')) {
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

    // 2. Verify JWT at the Edge
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const tenantId = payload.tenantId as string;

    // 3. Strict UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!tenantId || !uuidRegex.test(tenantId)) {
      throw new Error('INVALID_TENANT_ID');
    }

    // 4. Inject verified tenant ID into a secure custom header
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

// Ensure middleware only runs for relevant routes
export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
