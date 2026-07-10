import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';

/**
 * NCHQ Module 17: Advanced File Ingestion Controller
 * Sprint B: Runtime Input Schema & Data Locking
 */

const MAX_DOCUMENT_SIZE = 128 * 1024 * 1024; // 128MB

const IngestHeadersSchema = z.object({
  'x-nextcase-tenant-id': z.string().uuid().optional(),
  'x-tenant-id': z.string().uuid().optional(),
  'x-tenant-key-version': z.string().min(1),
}).refine(data => data['x-nextcase-tenant-id'] || data['x-tenant-id'], {
  message: "Tenant ID must be provided in 'x-nextcase-tenant-id' or 'x-tenant-id' header.",
});

export async function POST(request: Request) {
  const start = performance.now();

  try {
    const headerList = await headers();

    // Extract headers for validation
    const headerData = {
      'x-nextcase-tenant-id': headerList.get('x-nextcase-tenant-id'),
      'x-tenant-id': headerList.get('x-tenant-id') || headerList.get('X-Tenant-ID'),
      'x-tenant-key-version': headerList.get('x-tenant-key-version') || headerList.get('X-Tenant-Key-Version'),
    };

    // Strict Zod validation for headers
    const headerResult = IngestHeadersSchema.safeParse(headerData);
    if (!headerResult.success) {
      return NextResponse.json({
        error: 'BAD_REQUEST',
        message: 'Invalid or missing security headers.',
        details: headerResult.error.format()
      }, { status: 400 });
    }

    if (performance.now() - start > 5) console.warn('[INGEST] Header extraction exceeded 5ms budget');

    if (!request.body) return NextResponse.json({ error: 'BAD_REQUEST', message: 'Empty request body.' }, { status: 400 });

    const reader = request.body.getReader();
    let totalBytesReceived = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytesReceived += value.length;
      if (totalBytesReceived > MAX_DOCUMENT_SIZE) {
        return NextResponse.json({
          error: 'INGESTION_FAILURE',
          reason: 'SIZE_EXCEEDED',
          status: 'ABORTED'
        }, { status: 413 });
      }
    }

    const duration = performance.now() - start;
    if (duration > 50) console.warn(`[PERFORMANCE] Intake API took ${duration.toFixed(2)}ms`);

    return NextResponse.json({
      status: 'ACCEPTED',
      id: crypto.randomUUID(),
      bytes_received: totalBytesReceived
    }, { status: 202 });

  } catch (error) {
    return NextResponse.json({
      error: 'INGESTION_FAILURE',
      status: 'ABORTED'
    }, { status: 500 });
  }
}
