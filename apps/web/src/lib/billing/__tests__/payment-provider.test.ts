import { getPaymentProvider, isPaymentProviderConfigured, __resetPaymentProviderForTests } from '../payment-provider';
import { PaymentProviderNotConfiguredError } from '../errors';

const ENV_KEYS = ['PAYMENT_PROVIDER', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
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

describe('getPaymentProvider / isPaymentProviderConfigured', () => {
  let originalEnv: Record<EnvKey, string | undefined>;

  beforeEach(() => {
    originalEnv = snapshotEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    __resetPaymentProviderForTests();
  });

  afterEach(() => {
    restoreEnv(originalEnv);
    __resetPaymentProviderForTests();
  });

  test('is not configured when no Stripe keys are set', () => {
    expect(isPaymentProviderConfigured()).toBe(false);
  });

  test('throws PaymentProviderNotConfiguredError when called unconfigured', () => {
    expect(() => getPaymentProvider()).toThrow(PaymentProviderNotConfiguredError);
  });

  test('is not configured when only STRIPE_SECRET_KEY is set (webhook secret also required)', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    __resetPaymentProviderForTests();
    expect(isPaymentProviderConfigured()).toBe(false);
  });

  test('selects Stripe when both keys are set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    __resetPaymentProviderForTests();
    expect(isPaymentProviderConfigured()).toBe(true);
    expect(getPaymentProvider().name).toBe('stripe');
  });

  test('throws for an unrecognized PAYMENT_PROVIDER value', () => {
    process.env.PAYMENT_PROVIDER = 'not-a-real-provider';
    __resetPaymentProviderForTests();
    expect(() => getPaymentProvider()).toThrow(PaymentProviderNotConfiguredError);
  });
});
