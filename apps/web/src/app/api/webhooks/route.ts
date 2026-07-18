import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyWebhookSignature, WEBHOOK_TOLERANCE_SECONDS } from '@/lib/security/webhook-signature';
import { hasBeenSeen, remember } from '@/lib/security/replay-guard';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';

/**
 * NCHQ Module 13: Core Webhook Entry Point (Edge Runtime)
 * Sprint B: Runtime Input Schema & Data Locking
 *
 * Every request must carry a valid x-nextcase-signature (HMAC-SHA256 over
 * `${timestamp}.${rawBody}`) and a fresh x-nextcase-timestamp. Unsigned,
 * mis-signed, expired, tampered, or replayed requests are rejected before
 * the body is ever parsed as JSON.
 */

const WebhookPayloadSchema = z.object({
  event_type: z.string(),
  payload: z.record(z.string(), z.any()),
  timestamp: z.string().datetime().optional(),
});

const WEBHOOK_RATE_LIMIT_MAX = 60;
const WEBHOOK_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 requests/minute per IP

export async function POST(request: Request) {
  const start = performance.now();

  // Rate limit before any signature/body work, so a flood of garbage
  // requests can't spend CPU on HMAC computation before being turned away.
  const rateLimit = checkRateLimit(
    `webhook:${getClientIdentifier(request)}`,
    WEBHOOK_RATE_LIMIT_MAX,
    WEBHOOK_RATE_LIMIT_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  // Signature covers the exact raw bytes — must read as text before any
  // JSON parsing, since re-serializing would change the signed content.
  const rawBody = await request.text();
  const timestampHeader = request.headers.get('x-nextcase-timestamp');
  const signatureHeader = request.headers.get('x-nextcase-signature');

  const verification = await verifyWebhookSignature({ rawBody, timestampHeader, signatureHeader });
  if (!verification.valid) {
    return NextResponse.json(
      { error: 'SECURE_ACCESS_DENIED', reason: verification.reason },
      { status: 401 }
    );
  }

  // Replay protection: the same signed envelope (timestamp+body, which the
  // signature already binds together) may not be processed twice within
  // its validity window.
  if (hasBeenSeen(signatureHeader!)) {
    return NextResponse.json({ error: 'REPLAYED_REQUEST' }, { status: 409 });
  }
  remember(signatureHeader!, WEBHOOK_TOLERANCE_SECONDS * 1000);

  try {
    const rawPayload = JSON.parse(rawBody);

    // Strict Zod validation
    const result = WebhookPayloadSchema.safeParse(rawPayload);

    if (!result.success) {
      return NextResponse.json({
        error: 'BAD_REQUEST',
        message: 'Invalid webhook payload structure.',
        details: result.error.format()
      }, { status: 400 });
    }

    // NCHQ Module 19: India PII Scrubbing (Sprint C3)
    const scrubPII = (str: string) => str
      .replace(/[A-Z]{5}[0-9]{4}[A-Z]{1}/g, '[REDACTED_INDIA_PII]')
      .replace(/[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}/g, '[REDACTED_INDIA_PII]');

    const scrubbedPayload = JSON.parse(scrubPII(JSON.stringify(result.data.payload)));

    console.log(`[WEBHOOK] ${result.data.event_type} received. Payload scrubbed:`, JSON.stringify(scrubbedPayload));

    const duration = performance.now() - start;
    return NextResponse.json({
      status: 'ACCEPTED',
      event: result.data.event_type,
      latency: `${duration.toFixed(2)}ms`,
      processed_payload: scrubbedPayload
    }, { status: 202 });

  } catch (error) {
    return NextResponse.json({
      error: 'BAD_REQUEST',
      message: 'Malformed JSON payload.'
    }, { status: 400 });
  }
}

export const runtime = 'edge';
