import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';

/**
 * NCHQ Module 17: Advanced File Ingestion Controller
 * Sprint B: Runtime Input Schema & Data Locking
 */

const MAX_DOCUMENT_SIZE = 128 * 1024 * 1024; // 128MB

const IngestHeadersSchema = z.object({
  'x-tenant-key-version': z.string().min(1),
});

export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    // Tenant identity comes ONLY from the verified session cookie — never
    // from a client-supplied header. Any x-nextcase-tenant-id/x-tenant-id
    // header a caller sends is ignored entirely; this is what makes
    // cross-tenant spoofing impossible rather than merely unlikely.
    let session;
    try {
      session = await requireSession(request);
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        return NextResponse.json(
          { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
          { status: 401 }
        );
      }
      throw error;
    }
    const tenantId = session.tenantId;

    // Strict Zod validation for the remaining (non-identity) headers
    const headerResult = IngestHeadersSchema.safeParse({
      'x-tenant-key-version': request.headers.get('x-tenant-key-version') || request.headers.get('X-Tenant-Key-Version'),
    });
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
    const rawFileName = request.headers.get('x-file-name') || '';
    const rawMetadata = request.headers.get('x-document-metadata') || '';

    const scrubbedFileName = rawFileName ? scrubPII(rawFileName) : '';
    const scrubbedMetadata = rawMetadata ? scrubPII(rawMetadata) : '';

    if (rawFileName || rawMetadata) {
      console.log('[INGEST] Metadata PII Scrubbed:', {
        fileName: scrubbedFileName,
        metadata: scrubbedMetadata
      });
    }

    // Sprint C: Bypassing real DB for now, but simulating RLS session variable binding
    console.log(`[DB_CONTEXT] SET LOCAL nextcase.current_tenant_id = '${tenantId}'`);
    // In a production context, this would be:
    // await db.execute(tenantId, `INSERT INTO "DocumentEnvelope" ...`, [...]);

    return NextResponse.json({
      status: 'ACCEPTED',
      id: crypto.randomUUID(),
      tenant_id: tenantId,
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
