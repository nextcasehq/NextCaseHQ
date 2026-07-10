import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * NCHQ Module 13: Core Webhook Entry Point (Edge Runtime)
 * Sprint B: Runtime Input Schema & Data Locking
 */

const WebhookPayloadSchema = z.object({
  event_type: z.string(),
  payload: z.record(z.string(), z.any()),
  timestamp: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const start = performance.now();

  try {
    const rawPayload = await request.json();

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

    console.log(`[WEBHOOK] ${result.data.event_type} received. Payload scrubbed.`);

    const duration = performance.now() - start;
    return NextResponse.json({
      status: 'ACCEPTED',
      event: result.data.event_type,
      latency: `${duration.toFixed(2)}ms`
    }, { status: 202 });

  } catch (error) {
    return NextResponse.json({
      error: 'BAD_REQUEST',
      message: 'Malformed JSON payload.'
    }, { status: 400 });
  }
}

export const runtime = 'edge';
