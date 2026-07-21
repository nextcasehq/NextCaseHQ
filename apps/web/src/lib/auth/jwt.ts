import { SignJWT, jwtVerify } from 'jose';

/**
 * Shared with apps/web/src/proxy.ts — both must sign/verify with the same
 * secret and algorithm for session cookies minted here to be accepted
 * there. Pure `jose` + Web Crypto, no Node-only APIs, so this module works
 * equally well from proxy.ts (always nodejs runtime) and from ordinary
 * Node-runtime route handlers.
 */
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'nchq-secret-placeholder');
const JWT_ALG = 'HS256';
const SESSION_TTL = '24h';

export interface SessionClaims {
  sub: string;
  tenantId: string;
  email: string;
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ tenantId: claims.tenantId, email: claims.email })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  const { sub, tenantId, email } = payload;
  if (typeof sub !== 'string' || typeof tenantId !== 'string' || typeof email !== 'string') {
    throw new Error('INVALID_SESSION_CLAIMS');
  }
  return { sub, tenantId, email };
}
