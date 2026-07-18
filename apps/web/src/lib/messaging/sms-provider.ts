import type { SmsProvider } from './types';
import { SmsProviderNotConfiguredError } from './errors';
import { TwilioSmsProvider } from './providers/twilio-provider';

/**
 * Provider-agnostic SMS provider selection, mirroring email-provider.ts.
 * SMS_PROVIDER picks the vendor (only "twilio" is supported today — the
 * Product Owner's selected first provider — but the abstraction is ready
 * for a second without touching any call site).
 */

export type SmsProviderName = 'twilio';

function resolveProviderName(): SmsProviderName {
  const configured = (process.env.SMS_PROVIDER || 'twilio').toLowerCase();
  if (configured !== 'twilio') {
    throw new SmsProviderNotConfiguredError(`SMS_PROVIDER must be "twilio" (got "${configured}").`);
  }
  return configured;
}

let provider: SmsProvider | null | undefined;

function buildProvider(): SmsProvider | null {
  resolveProviderName(); // only twilio is supported today; throws on an unrecognized value

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }
  return new TwilioSmsProvider(accountSid, authToken, fromNumber);
}

export function isSmsProviderConfigured(): boolean {
  if (provider === undefined) {
    provider = buildProvider();
  }
  return provider !== null;
}

export function getSmsProvider(): SmsProvider {
  if (provider === undefined) {
    provider = buildProvider();
  }
  if (!provider) {
    throw new SmsProviderNotConfiguredError(
      'SMS provider is not configured — TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER are unset.'
    );
  }
  return provider;
}

/** Test-only: force re-evaluation of SMS_PROVIDER/TWILIO_* env vars. */
export function __resetSmsProviderForTests(): void {
  provider = undefined;
}
