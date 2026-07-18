import type { NextRequest } from 'next/server';
import { verifySessionToken, type SessionClaims } from './jwt';
import { SESSION_COOKIE_NAME } from './session-cookie';

// apps/web compiles to ES5 (see tsconfig.json), where `class X extends Error`
// doesn't correctly wire up the prototype chain unless restored manually —
// otherwise `error instanceof UnauthenticatedError` is silently false and
// every auth failure falls through to a generic 500 instead of a 401.
export class UnauthenticatedError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, UnauthenticatedError.prototype);
  }
}

/**
 * Reads and verifies the httpOnly session cookie directly off the request
 * object (NextRequest.cookies), not via next/headers' cookies()/headers()
 * helpers — those rely on Next.js's request-scoped async context, which
 * only exists inside a real server request lifecycle. Calling a route
 * handler directly (as tests do) throws outside that context, silently
 * turning every auth failure into a generic 500. Reading off the request
 * object itself works identically in production and in tests.
 *
 * This is the ONLY trusted source of authenticated tenant identity for
 * server-side route handlers — never trust a client-supplied tenant
 * header, query param, or body field. Throws UnauthenticatedError if
 * there is no session or it fails verification.
 */
export async function requireSession(request: NextRequest): Promise<SessionClaims> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new UnauthenticatedError('No active session.');
  }
  try {
    return await verifySessionToken(token);
  } catch {
    throw new UnauthenticatedError('Invalid or expired session.');
  }
}
