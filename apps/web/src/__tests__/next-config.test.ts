import nextConfig from '../../next.config';

describe('next.config.ts — global security headers', () => {
  test('applies CSP and static security headers to every route', async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');

    const names = rules[0].headers.map((h) => h.key);
    expect(names).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'Strict-Transport-Security',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ])
    );

    const csp = rules[0].headers.find((h) => h.key === 'Content-Security-Policy')?.value;
    expect(csp).toContain(`frame-ancestors 'none'`);
  });
});
