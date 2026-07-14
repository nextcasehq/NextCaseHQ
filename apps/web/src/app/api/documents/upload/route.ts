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

    // NCHQ Module 19: India PII Scrubbing (Sprint C3)
    const scrubPII = (str: string) => str
      .replace(/[A-Z]{5}[0-9]{4}[A-Z]{1}/g, '[REDACTED_INDIA_PII]')
      .replace(/[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}/g, '[REDACTED_INDIA_PII]');

    // We scrub the file name or document metadata from incoming headers if present
    const rawFileName = headerList.get('x-file-name') || '';
    const rawMetadata = headerList.get('x-document-metadata') || '';

    const scrubbedFileName = rawFileName ? scrubPII(rawFileName) : '';
    const scrubbedMetadata = rawMetadata ? scrubPII(rawMetadata) : '';

    if (rawFileName || rawMetadata) {
      console.log('[INGEST] Metadata PII Scrubbed:', {
        fileName: scrubbedFileName,
        metadata: scrubbedMetadata
      });
    }

    // Sprint C: Bypassing real DB for now, but simulating RLS session variable binding
    const validatedTenantId = headerResult.data['x-nextcase-tenant-id'] || headerResult.data['x-tenant-id'];

    // NCHQ Module 20: RLS Session Guard Verification
    try {
      console.log(`[DB_CONTEXT] SET LOCAL nextcase.current_tenant_id = '${validatedTenantId}'`);
      // In a production Prisma context, this would be:
      // await db.$executeRawUnsafe(`SET LOCAL nextcase.current_tenant_id = '${validatedTenantId}'`);
    } catch (dbError) {
      return NextResponse.json({ error: 'DB_ACCESS_VIOLATION', status: 'ABORTED' }, { status: 403 });
    }

    return NextResponse.json({
      status: 'ACCEPTED',
      id: crypto.randomUUID(),
      bytes_received: totalBytesReceived,
      scrubbed_metadata: {
        file_name: scrubbedFileName,
        metadata: scrubbedMetadata
      }
    }, { status: 202 });

  } catch (error) {
    return NextResponse.json({
      error: 'INGESTION_FAILURE',
      status: 'ABORTED'
    }, { status: 500 });
  }
}
