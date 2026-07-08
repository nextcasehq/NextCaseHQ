import { NextResponse } from 'next/server';

/**
 * NCHQ Module 5: Next.js Upload API Entry Point
 */

export async function POST(request: Request) {
  const start = performance.now();

  try {
    const payload = await request.json();

    // 1. Validate payload presence
    if (!payload || !payload.encryptedData || !payload.id) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
    }

    // 2. Simulate environment variable check for secure processing
    const isProcessingEnabled = process.env.ENABLE_DOCUMENT_INGESTION === 'true';
    if (!isProcessingEnabled) {
       // In Task 1 recovery, we default to ACCEPTED but log that processing is deferred
       console.log('[API] Document ingestion deferred: processing disabled.');
    }

    // 3. Simulated Queue Push
    process.nextTick(() => {
      console.log(`[API] Pushed document ${payload.id} to background queue.`);
    });

    const end = performance.now();
    const duration = end - start;

    if (duration > 50) {
      console.warn(`[PERFORMANCE] Upload API took ${duration.toFixed(2)}ms`);
    }

    return NextResponse.json({
      status: 'ACCEPTED',
      id: payload.id,
      processingTime: `${duration.toFixed(2)}ms`
    }, { status: 202 });

  } catch (error) {
    // Secure structural exception handling
    return NextResponse.json({
      error: 'INGESTION_FAILURE',
      message: 'A secure system error occurred during ingestion.'
    }, { status: 500 });
  }
}
