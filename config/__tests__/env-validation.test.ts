import { validateEnv } from '../env.schema';

describe('Production Environment Validation', () => {
  const validConfig = {
    DNS: 'https://app.nextcase.in',
    SSL_PATH: '/etc/ssl/certs',
    OAUTH_URL: 'https://auth.nextcase.in',
    DB_SESSION_URL: 'postgres://user:pass@localhost:5432/db',
    NODE_ENV: 'production',
  };

  it('should validate a correct production configuration', () => {
    expect(() => validateEnv(validConfig)).not.toThrow();
  });

  it('should halt initialization if OAUTH_URL is missing', () => {
    const invalidConfig = { ...validConfig };
    // @ts-ignore
    delete invalidConfig.OAUTH_URL;

    expect(() => validateEnv(invalidConfig)).toThrow();
  });

  it('should throw clear Zod error for invalid DNS format', () => {
    const invalidConfig = { ...validConfig, DNS: 'invalid-url' };
    expect(() => validateEnv(invalidConfig)).toThrow();
  });
});
