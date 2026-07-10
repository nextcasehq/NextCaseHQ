import { NextResponse } from 'next/server';

/**
 * NCHQ Module 13: Core Webhook Entry Point (Edge Runtime)
 */
export async function POST(request: Request) {
  const start = performance.now();
  console.log('[WEBHOOK] Payload received.');

  const duration = performance.now() - start;
  return NextResponse.json({ status: 'ACCEPTED', latency: `${duration.toFixed(2)}ms` }, { status: 202 });
}
export const runtime = 'edge';
