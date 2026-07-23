import { getSmsProvider, isSmsProviderConfigured, __resetSmsProviderForTests } from '../sms-provider';
import { SmsProviderNotConfiguredError } from '../errors';

const ENV_KEYS = ['SMS_PROVIDER', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'] as const;
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

describe('getSmsProvider / isSmsProviderConfigured', () => {
  let originalEnv: Record<EnvKey, string | undefined>;

  beforeEach(() => {
    originalEnv = snapshotEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    __resetSmsProviderForTests();
  });

  afterEach(() => {
    restoreEnv(originalEnv);
    __resetSmsProviderForTests();
  });

  test('is not configured when no Twilio keys are set', () => {
    expect(isSmsProviderConfigured()).toBe(false);
  });

  test('throws SmsProviderNotConfiguredError when called unconfigured', () => {
    expect(() => getSmsProvider()).toThrow(SmsProviderNotConfiguredError);
  });

  test('is not configured when only some Twilio keys are set', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'auth_test';
    __resetSmsProviderForTests();
    expect(isSmsProviderConfigured()).toBe(false);
  });

  test('selects Twilio when all three are set', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'auth_test';
    process.env.TWILIO_FROM_NUMBER = '+15551234567';
    __resetSmsProviderForTests();
    expect(isSmsProviderConfigured()).toBe(true);
    expect(getSmsProvider().name).toBe('twilio');
  });

  test('throws for an unrecognized SMS_PROVIDER value', () => {
    process.env.SMS_PROVIDER = 'not-a-real-provider';
    __resetSmsProviderForTests();
    expect(() => getSmsProvider()).toThrow(SmsProviderNotConfiguredError);
  });
});
