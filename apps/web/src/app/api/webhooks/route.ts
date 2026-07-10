import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * NCHQ Module 13: Core Webhook Entry Point (Edge Runtime)
 * Sprint B: Runtime Input Schema & Data Locking
 */

const WebhookPayloadSchema = z.object({
  event_type: z.string(),
  payload: z.record(z.any()),
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

    console.log(`[WEBHOOK] ${result.data.event_type} received.`);

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
