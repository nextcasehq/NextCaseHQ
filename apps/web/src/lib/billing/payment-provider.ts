import type { PaymentProvider } from './types';
import { PaymentProviderNotConfiguredError } from './errors';
import { StripePaymentProvider } from './providers/stripe-provider';

/**
 * Provider-agnostic payment provider selection, same lazy-singleton
 * pattern as lib/ai/llm-provider.ts. PAYMENT_PROVIDER picks the vendor
 * (only "stripe" is supported today — the Product Owner's selected first
 * provider — but the abstraction is ready for a second without touching
 * any call site).
 */

export type PaymentProviderName = 'stripe';

function resolveProviderName(): PaymentProviderName {
  const configured = (process.env.PAYMENT_PROVIDER || 'stripe').toLowerCase();
  if (configured !== 'stripe') {
    throw new PaymentProviderNotConfiguredError(`PAYMENT_PROVIDER must be "stripe" (got "${configured}").`);
  }
  return configured;
}

let provider: PaymentProvider | null | undefined;

function buildProvider(): PaymentProvider | null {
  resolveProviderName(); // only stripe is supported today; throws on an unrecognized value

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return null;
  }
  return new StripePaymentProvider(secretKey, webhookSecret);
}

export function isPaymentProviderConfigured(): boolean {
  if (provider === undefined) {
    provider = buildProvider();
  }
  return provider !== null;
}

export function getPaymentProvider(): PaymentProvider {
  if (provider === undefined) {
    provider = buildProvider();
  }
  if (!provider) {
    throw new PaymentProviderNotConfiguredError(
      'Payment provider is not configured — STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are unset.'
    );
  }
  return provider;
}

/** Test-only: force re-evaluation of PAYMENT_PROVIDER/STRIPE_* env vars. */
export function __resetPaymentProviderForTests(): void {
  provider = undefined;
}
