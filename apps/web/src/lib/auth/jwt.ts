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
// Trusted server session lifetime — shared by every sign-in method (Phone
// OTP included; there is only ever one kind of session token). Defaults to
// the Phone OTP Authentication spec's ~30 days; SESSION_TTL_SECONDS
// overrides it, matching session-cookie.ts's own cookie Max-Age, which
// must stay equal to this or the cookie would outlive (or expire before)
// the JWT it carries.
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS) || 60 * 60 * 24 * 30;

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
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
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
