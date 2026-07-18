import type { EmailProvider } from './types';
import { EmailProviderNotConfiguredError } from './errors';
import { ResendEmailProvider } from './providers/resend-provider';

/**
 * Provider-agnostic email provider selection, same lazy-singleton pattern
 * as lib/ai/llm-provider.ts and lib/billing/payment-provider.ts.
 * EMAIL_PROVIDER picks the vendor (only "resend" is supported today — the
 * Product Owner's selected first provider — but the abstraction is ready
 * for a second without touching any call site).
 */

export type EmailProviderName = 'resend';

function resolveProviderName(): EmailProviderName {
  const configured = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
  if (configured !== 'resend') {
    throw new EmailProviderNotConfiguredError(`EMAIL_PROVIDER must be "resend" (got "${configured}").`);
  }
  return configured;
}

let provider: EmailProvider | null | undefined;

function buildProvider(): EmailProvider | null {
  resolveProviderName(); // only resend is supported today; throws on an unrecognized value

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  if (!apiKey || !fromAddress) {
    return null;
  }
  return new ResendEmailProvider(apiKey, fromAddress);
}

export function isEmailProviderConfigured(): boolean {
  if (provider === undefined) {
    provider = buildProvider();
  }
  return provider !== null;
}

export function getEmailProvider(): EmailProvider {
  if (provider === undefined) {
    provider = buildProvider();
  }
  if (!provider) {
    throw new EmailProviderNotConfiguredError(
      'Email provider is not configured — RESEND_API_KEY/EMAIL_FROM_ADDRESS are unset.'
    );
  }
  return provider;
}

/** Test-only: force re-evaluation of EMAIL_PROVIDER/RESEND_API_KEY/EMAIL_FROM_ADDRESS env vars. */
export function __resetEmailProviderForTests(): void {
  provider = undefined;
}
