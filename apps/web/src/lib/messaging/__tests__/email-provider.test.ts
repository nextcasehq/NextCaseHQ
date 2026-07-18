import { getEmailProvider, isEmailProviderConfigured, __resetEmailProviderForTests } from '../email-provider';
import { EmailProviderNotConfiguredError } from '../errors';

const ENV_KEYS = ['EMAIL_PROVIDER', 'RESEND_API_KEY', 'EMAIL_FROM_ADDRESS'] as const;
type EnvKey = (typeof ENV_KEYS)[number];

function snapshotEnv(): Record<EnvKey, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]])) as Record<EnvKey, string | undefined>;
}

function restoreEnv(snapshot: Record<EnvKey, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

describe('getEmailProvider / isEmailProviderConfigured', () => {
  let originalEnv: Record<EnvKey, string | undefined>;

  beforeEach(() => {
    originalEnv = snapshotEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    __resetEmailProviderForTests();
  });

  afterEach(() => {
    restoreEnv(originalEnv);
    __resetEmailProviderForTests();
  });

  test('is not configured when no Resend keys are set', () => {
    expect(isEmailProviderConfigured()).toBe(false);
  });

  test('throws EmailProviderNotConfiguredError when called unconfigured', () => {
    expect(() => getEmailProvider()).toThrow(EmailProviderNotConfiguredError);
  });

  test('is not configured when only RESEND_API_KEY is set (from address also required)', () => {
    process.env.RESEND_API_KEY = 're_test_123';
    __resetEmailProviderForTests();
    expect(isEmailProviderConfigured()).toBe(false);
  });

  test('selects Resend when both are set', () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.EMAIL_FROM_ADDRESS = 'noreply@nextcasehq.com';
    __resetEmailProviderForTests();
    expect(isEmailProviderConfigured()).toBe(true);
    expect(getEmailProvider().name).toBe('resend');
  });

  test('throws for an unrecognized EMAIL_PROVIDER value', () => {
    process.env.EMAIL_PROVIDER = 'not-a-real-provider';
    __resetEmailProviderForTests();
    expect(() => getEmailProvider()).toThrow(EmailProviderNotConfiguredError);
  });
});
