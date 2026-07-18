import { collectStartupEnvIssues, validateStartupEnv } from '../env-validation';

function baseProdEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://nextcase_app:realpw@db.example.com:5432/nextcase',
    JWT_SECRET: 'a-real-random-secret',
    WEBHOOK_SIGNING_SECRET: 'another-real-random-secret',
    ADMIN_ACCESS_TOKEN: 'yet-another-real-random-secret',
    ADMIN_SESSION_SECRET: 'still-another-real-random-secret',
    REDIS_URL: 'redis://prod-redis.example.com:6379',
    S3_ENDPOINT: 'https://s3.example-provider.com',
    S3_BUCKET: 'nextcase-documents-prod',
    S3_ACCESS_KEY_ID: 'a-real-access-key',
    S3_SECRET_ACCESS_KEY: 'a-real-secret-key',
  } as NodeJS.ProcessEnv;
}

describe('collectStartupEnvIssues', () => {
  test('no issues in non-production environments, even with insecure defaults', () => {
    const issues = collectStartupEnvIssues({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(issues).toEqual([]);
  });

  test('no issues when production has all real secrets set', () => {
    expect(collectStartupEnvIssues(baseProdEnv())).toEqual([]);
  });

  test('flags a missing DATABASE_URL in production', () => {
    const env = baseProdEnv();
    delete env.DATABASE_URL;
    const issues = collectStartupEnvIssues(env);
    expect(issues.some((i) => i.variable === 'DATABASE_URL')).toBe(true);
  });

  test('flags a missing JWT_SECRET in production', () => {
    const env = baseProdEnv();
    delete env.JWT_SECRET;
    expect(collectStartupEnvIssues(env).some((i) => i.variable === 'JWT_SECRET')).toBe(true);
  });

  test('flags the known insecure JWT_SECRET placeholder even if explicitly set', () => {
    const env = { ...baseProdEnv(), JWT_SECRET: 'nchq-secret-placeholder' };
    expect(collectStartupEnvIssues(env).some((i) => i.variable === 'JWT_SECRET')).toBe(true);
  });

  test('flags the known insecure WEBHOOK_SIGNING_SECRET placeholder', () => {
    const env = { ...baseProdEnv(), WEBHOOK_SIGNING_SECRET: 'nchq-webhook-secret-placeholder' };
    expect(collectStartupEnvIssues(env).some((i) => i.variable === 'WEBHOOK_SIGNING_SECRET')).toBe(true);
  });

  test('flags the known insecure ADMIN_ACCESS_TOKEN placeholder', () => {
    const env = { ...baseProdEnv(), ADMIN_ACCESS_TOKEN: 'nchq-admin-secret-key-2026' };
    expect(collectStartupEnvIssues(env).some((i) => i.variable === 'ADMIN_ACCESS_TOKEN')).toBe(true);
  });

  test('flags the known insecure ADMIN_SESSION_SECRET placeholder', () => {
    const env = { ...baseProdEnv(), ADMIN_SESSION_SECRET: 'nchq-admin-session-secret-placeholder' };
    expect(collectStartupEnvIssues(env).some((i) => i.variable === 'ADMIN_SESSION_SECRET')).toBe(true);
  });

  test('flags a missing REDIS_URL in production', () => {
    const env = baseProdEnv();
    delete env.REDIS_URL;
    expect(collectStartupEnvIssues(env).some((i) => i.variable === 'REDIS_URL')).toBe(true);
  });

  test('flags missing S3_* object storage variables in production', () => {
    const env = baseProdEnv();
    delete env.S3_ENDPOINT;
    delete env.S3_BUCKET;
    const issues = collectStartupEnvIssues(env);
    expect(issues.some((i) => i.variable.includes('S3_ENDPOINT') && i.variable.includes('S3_BUCKET'))).toBe(true);
  });
});

describe('validateStartupEnv', () => {
  test('does not throw when production env is fully configured', () => {
    expect(() => validateStartupEnv(baseProdEnv())).not.toThrow();
  });

  test('does not throw outside production regardless of missing secrets', () => {
    expect(() => validateStartupEnv({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).not.toThrow();
  });

  test('throws with a descriptive message when production is misconfigured', () => {
    const env = baseProdEnv();
    delete env.JWT_SECRET;
    expect(() => validateStartupEnv(env)).toThrow(/JWT_SECRET/);
  });
});
