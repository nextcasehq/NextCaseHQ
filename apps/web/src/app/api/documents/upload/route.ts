import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { isObjectStorageConfigured, putObject, deleteObject } from '@/lib/storage/object-storage';
import { validateFileType, buildObjectKey } from '@/lib/storage/document-key';

/**
 * NCHQ Module 17: Advanced File Ingestion Controller
 * Sprint B: Runtime Input Schema & Data Locking
 *
 * Persists a real DocumentEnvelope row AND the actual file bytes, via the
 * provider-agnostic object storage adapter (lib/storage/object-storage.ts
 * — real S3 API, works against any S3-compatible endpoint).
 */

const MAX_DOCUMENT_SIZE = 128 * 1024 * 1024; // 128MB
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    if (!isObjectStorageConfigured()) {
      return NextResponse.json(
        { error: 'OBJECT_STORAGE_NOT_CONFIGURED', message: 'Object storage is not configured on this server.' },
        { status: 503 }
      );
    }

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

    const rawCaseId = request.headers.get('x-case-id');
    if (rawCaseId && !UUID_PATTERN.test(rawCaseId)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid x-case-id.' }, { status: 400 });
    }

    const rawFileName = request.headers.get('x-file-name') || '';
    if (!rawFileName) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'x-file-name is required.' }, { status: 400 });
    }

    const fileTypeResult = validateFileType(rawFileName);
    if (!fileTypeResult.valid) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: fileTypeResult.reason }, { status: 400 });
    }

    if (!request.body) return NextResponse.json({ error: 'BAD_REQUEST', message: 'Empty request body.' }, { status: 400 });

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
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
      chunks.push(value);
    }
    const fileBuffer = Buffer.concat(chunks);

    if (fileBuffer.length === 0) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Empty file body.' }, { status: 400 });
    }

    const duration = performance.now() - start;
    if (duration > 50) console.warn(`[PERFORMANCE] Intake API took ${duration.toFixed(2)}ms`);

    // NCHQ Module 19: India PII Scrubbing (Sprint C3)
    const scrubPII = (str: string) => str
      .replace(/[A-Z]{5}[0-9]{4}[A-Z]{1}/g, '[REDACTED_INDIA_PII]')
      .replace(/[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}/g, '[REDACTED_INDIA_PII]');

    const rawMetadata = request.headers.get('x-document-metadata') || '';
    const scrubbedFileName = scrubPII(rawFileName);
    const scrubbedMetadata = rawMetadata ? scrubPII(rawMetadata) : '';

    console.log('[INGEST] Metadata PII Scrubbed:', {
      fileName: scrubbedFileName,
      metadata: scrubbedMetadata
    });

    const db = new DatabaseClient();

    // PostgreSQL foreign key checks always bypass row security by design
    // ("Referential integrity checks ... always bypass row security" —
    // this is documented Postgres behavior, not a bug) — so the
    // DocumentEnvelope.case_id -> LegalCase(id) FK alone would silently
    // accept a case_id belonging to a DIFFERENT tenant. Confirmed with a
    // real cross-tenant case_id in testing: the FK let it through. This
    // explicit, RLS-scoped SELECT is what actually enforces tenant
    // ownership of case_id before the insert is allowed to proceed.
    if (rawCaseId) {
      const caseRows = await db.execute<{ id: string }>(
        tenantId,
        `SELECT id FROM "LegalCase" WHERE id = $1`,
        [rawCaseId]
      );
      if (caseRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'x-case-id does not reference an accessible case.' },
          { status: 400 }
        );
      }
    }

    // Generated up front (rather than letting Postgres's gen_random_uuid()
    // default assign it) so the object key can incorporate the real
    // DocumentEnvelope id, keeping storage and metadata identifiers in sync.
    const documentId = crypto.randomUUID();
    const objectKey = buildObjectKey(tenantId, documentId, scrubbedFileName);

    const uploadResult = await putObject(objectKey, fileBuffer, fileTypeResult.contentType!);

    let envelope;
    try {
      const rows = await db.execute<{ id: string; tenant_id: string; case_id: string | null; created_at: string }>(
        tenantId,
        `INSERT INTO "DocumentEnvelope" (id, tenant_id, case_id, title, storage_structure)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, tenant_id, case_id, created_at`,
        [
          documentId,
          tenantId,
          rawCaseId ?? null,
          scrubbedFileName,
          {
            storage_provider: 's3',
            object_key: objectKey,
            content_type: fileTypeResult.contentType,
            bytes_stored: fileBuffer.length,
            etag: uploadResult.etag,
          },
        ]
      );
      envelope = rows[0];
    } catch (dbError) {
      // The object is already durably stored — if the metadata row fails
      // to save, clean up the now-orphaned object rather than leaking
      // storage with no DB record pointing at it.
      await deleteObject(objectKey).catch(() => {});
      throw dbError;
    }

    return NextResponse.json({
      status: 'ACCEPTED',
      id: envelope.id,
      tenant_id: envelope.tenant_id,
      case_id: envelope.case_id,
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
