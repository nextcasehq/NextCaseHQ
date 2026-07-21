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

    const rawMatterId = request.headers.get('x-matter-id');
    if (rawMatterId && !UUID_PATTERN.test(rawMatterId)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid x-matter-id.' }, { status: 400 });
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
    let caseMatterId: string | null = null;
    if (rawCaseId) {
      const caseRows = await db.execute<{ id: string; matter_id: string | null }>(
        tenantId,
        `SELECT id, matter_id FROM "LegalCase" WHERE id = $1`,
        [rawCaseId]
      );
      if (caseRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'x-case-id does not reference an accessible case.' },
          { status: 400 }
        );
      }
      caseMatterId = caseRows[0].matter_id;
    }

    // Same FK-bypasses-RLS reasoning as case_id above, re-verified
    // independently of whatever a linked Proceeding's own matter_id says.
    if (rawMatterId) {
      const matterRows = await db.execute<{ id: string }>(
        tenantId,
        `SELECT id FROM "Matter" WHERE id = $1`,
        [rawMatterId]
      );
      if (matterRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'x-matter-id does not reference an accessible matter.' },
          { status: 400 }
        );
      }
    }

    // Sprint 3, Decision 1 (confirmed): a Proceeding is an optional,
    // additional tag on top of a Document's primary Matter ownership — the
    // two must agree. If the caller gives both, the Proceeding must belong
    // to that same Matter (a Proceeding with no Matter of its own does not
    // "belong" to any Matter, so an explicit matter_id together with it is
    // rejected too, not silently accepted). If the caller gives only
    // case_id, the Document inherits whatever Matter that Proceeding
    // already belongs to (including none) — exact prior behavior when the
    // Proceeding has no Matter, matching Milestone 1's LegalCase.matter_id
    // backward-compatibility guarantee.
    if (rawCaseId && rawMatterId && caseMatterId !== rawMatterId) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          code: 'MATTER_CASE_MISMATCH',
          message: 'x-matter-id does not match the Matter that x-case-id belongs to.',
        },
        { status: 400 }
      );
    }
    const resolvedMatterId = rawMatterId ?? (rawCaseId ? caseMatterId : null);

    // Generated up front (rather than letting Postgres's gen_random_uuid()
    // default assign it) so the object key can incorporate the real
    // DocumentEnvelope id, keeping storage and metadata identifiers in sync.
    const documentId = crypto.randomUUID();
    const objectKey = buildObjectKey(tenantId, documentId, scrubbedFileName, 1);

    const uploadResult = await putObject(objectKey, fileBuffer, fileTypeResult.contentType!);

    try {
      // A single atomic statement: DocumentEnvelope and its first
      // DocumentVersion are created together — never a DocumentEnvelope row
      // with no version. There is no current_version_id pointer to update
      // afterward (the current version is simply whichever has the highest
      // version_number for this document_id — see db/schema.sql), so this
      // is the entire write, not a first step of one. Every value in the
      // response below is already known from the request itself
      // (documentId, tenantId, rawCaseId, resolvedMatterId were all
      // computed above) — there is no need to read anything back from the
      // RETURNING clause, only to confirm the write actually happened.
      const rows = await db.execute<{ document_id: string }>(
        tenantId,
        `WITH new_envelope AS (
           INSERT INTO "DocumentEnvelope" (id, tenant_id, case_id, matter_id, title, storage_structure)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id
         )
         INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes, etag, uploaded_by)
         SELECT $2, new_envelope.id, 1, $7, $8, $9, $10, $11 FROM new_envelope
         RETURNING document_id`,
        [
          documentId,
          tenantId,
          rawCaseId ?? null,
          resolvedMatterId,
          scrubbedFileName,
          {
            storage_provider: 's3',
            object_key: objectKey,
            content_type: fileTypeResult.contentType,
            bytes_stored: fileBuffer.length,
            etag: uploadResult.etag,
          },
          objectKey,
          fileTypeResult.contentType,
          fileBuffer.length,
          uploadResult.etag ?? null,
          session.sub,
        ]
      );
      if (rows.length === 0) {
        throw new Error('Failed to persist the document envelope and its first version.');
      }
    } catch (dbError) {
      // The object is already durably stored — if the metadata row fails
      // to save, clean up the now-orphaned object rather than leaking
      // storage with no DB record pointing at it.
      await deleteObject(objectKey).catch(() => {});
      throw dbError;
    }

    return NextResponse.json({
      status: 'ACCEPTED',
      id: documentId,
      tenant_id: tenantId,
      case_id: rawCaseId ?? null,
      matter_id: resolvedMatterId,
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
