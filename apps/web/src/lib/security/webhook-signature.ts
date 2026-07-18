/**
 * HMAC-SHA256 webhook signing/verification, Stripe/GitHub-style: the
 * signature covers `${timestamp}.${rawBody}` (not just the body), so a
 * captured old signature can't be replayed against a new timestamp, and a
 * request without a fresh timestamp is rejected as expired before the
 * signature is even checked.
 *
 * Uses Web Crypto (crypto.subtle) rather than Node's `crypto` module so
 * this works identically on the webhook route's Edge runtime and in the
 * Node test environment (both expose a global `crypto.subtle`).
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SIGNING_SECRET || 'nchq-webhook-secret-placeholder';
export const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes, matching common webhook provider defaults

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signWebhookPayload(rawBody: string, timestampSeconds: number): Promise<string> {
  const digest = await hmacSha256Hex(WEBHOOK_SECRET, `${timestampSeconds}.${rawBody}`);
  return `sha256=${digest}`;
}

export type WebhookVerificationFailureReason =
  | 'MISSING_HEADERS'
  | 'INVALID_TIMESTAMP'
  | 'EXPIRED'
  | 'INVALID_SIGNATURE';

export type WebhookVerificationResult =
  | { valid: true }
  | { valid: false; reason: WebhookVerificationFailureReason };

export async function verifyWebhookSignature(params: {
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  nowSeconds?: number;
}): Promise<WebhookVerificationResult> {
  const { rawBody, timestampHeader, signatureHeader } = params;
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!timestampHeader || !signatureHeader) {
    return { valid: false, reason: 'MISSING_HEADERS' };
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return { valid: false, reason: 'INVALID_TIMESTAMP' };
  }

  if (Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, reason: 'EXPIRED' };
  }

  const expectedSignature = await signWebhookPayload(rawBody, timestamp);
  if (!constantTimeEqual(expectedSignature, signatureHeader)) {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  return { valid: true };
}
