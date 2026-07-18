import { buildContentSecurityPolicy, SECURITY_HEADERS } from '../security-headers';

describe('buildContentSecurityPolicy', () => {
  test('restricts scripts to same-origin (blocks loading from an external/attacker-controlled origin)', () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain(`script-src 'self' 'unsafe-inline'`);
  });

  test('denies framing and restricts default-src to self', () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain(`frame-ancestors 'none'`);
    expect(csp).toContain(`default-src 'self'`);
    expect(csp).toContain(`object-src 'none'`);
    expect(csp).toContain(`base-uri 'self'`);
    expect(csp).toContain(`form-action 'self'`);
  });
});

describe('SECURITY_HEADERS', () => {
  function getHeader(name: string): string | undefined {
    return SECURITY_HEADERS.find(([key]) => key === name)?.[1];
  }

  test('includes CSP and all required static headers', () => {
    expect(getHeader('Content-Security-Policy')).toContain(`default-src 'self'`);
    expect(getHeader('Strict-Transport-Security')).toContain('max-age=');
    expect(getHeader('X-Frame-Options')).toBe('DENY');
    expect(getHeader('X-Content-Type-Options')).toBe('nosniff');
    expect(getHeader('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(getHeader('Permissions-Policy')).toContain('camera=()');
  });
});
