import { signAdminSessionToken, verifyAdminSessionToken } from '../admin-session';

describe('admin-session — signed admin session tokens', () => {
  test('a freshly signed token verifies as authorized', async () => {
    const token = await signAdminSessionToken();
    expect(await verifyAdminSessionToken(token)).toBe(true);
  });

  test('a garbage/forged string does not verify', async () => {
    expect(await verifyAdminSessionToken('totally-not-a-jwt')).toBe(false);
  });

  test('a well-formed but wrongly-signed JWT does not verify', async () => {
    // Same shape as a real admin token, signed with a different secret —
    // simulates an attacker who knows the token format but not the secret.
    const { SignJWT } = await import('jose');
    const wrongSecret = new TextEncoder().encode('some-other-secret');
    const forged = await new SignJWT({ role: 'PLATFORM_ADMIN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(wrongSecret);
    expect(await verifyAdminSessionToken(forged)).toBe(false);
  });

  test('a validly-signed token without the expected role claim does not verify', async () => {
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode(
      process.env.ADMIN_SESSION_SECRET || 'nchq-admin-session-secret-placeholder'
    );
    const wrongRole = await new SignJWT({ role: 'SOMETHING_ELSE' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    expect(await verifyAdminSessionToken(wrongRole)).toBe(false);
  });
});
