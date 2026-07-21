import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { isObjectStorageConfigured, putObject, deleteObject } from '@/lib/storage/object-storage';
import { validateFileType, buildObjectKey, MAX_DOCUMENT_SIZE_BYTES } from '@/lib/storage/document-key';
import { isValidDocumentTypeSlug } from '@/lib/domain/document-type';

/**
 * NCHQ Module 17: Advanced File Ingestion Controller
 * Sprint B: Runtime Input Schema & Data Locking
 *
 * Persists a real DocumentEnvelope row AND the actual file bytes, via the
 * provider-agnostic object storage adapter (lib/storage/object-storage.ts
 * — real S3 API, works against any S3-compatible endpoint).
 */

const MAX_DOCUMENT_SIZE = MAX_DOCUMENT_SIZE_BYTES;
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

    // Milestone 4 (Prepare Document): the drafting flow's "Save Draft"
    // step submits its reviewed text through this exact endpoint, adding
    // only this one optional header — no separate persistence path.
    // Omitted entirely by every plain file upload, which keeps
    // document_type NULL exactly as before this milestone.
    const rawDocumentType = request.headers.get('x-document-type');
    if (rawDocumentType && !isValidDocumentTypeSlug(rawDocumentType)) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: `Unrecognized x-document-type: ${rawDocumentType}` },
        { status: 400 }
      );
    }
    const documentType = rawDocumentType || null;

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
    // DocumentEnvelope.case_id/matter_id -> LegalCase/Matter(id) FKs alone
    // would silently accept an id belonging to a DIFFERENT tenant.
    // Confirmed with a real cross-tenant case_id in testing: the FK let it
    // through. These explicit, RLS-scoped SELECTs are what actually
    // enforce tenant ownership before the insert is allowed to proceed.
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

    // Proceeding/Matter consistency: a document explicitly tagged with
    // both x-case-id and x-matter-id must not disagree with the
    // Proceeding's own parent Matter — that would let a document appear
    // linked to a Matter it has no real relationship to.
    if (rawMatterId && caseMatterId && rawMatterId !== caseMatterId) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          code: 'PROCEEDING_MATTER_MISMATCH',
          message: "x-matter-id does not match the parent Matter of the Proceeding referenced by x-case-id.",
        },
        { status: 400 }
      );
    }

    // When x-matter-id is omitted but x-case-id resolves to a Proceeding
    // that itself belongs to a Matter, the document inherits that Matter
    // link automatically — so it's directly discoverable from the Matter
    // workspace without every caller having to pass both ids explicitly.
    const effectiveMatterId = rawMatterId ?? caseMatterId;

    if (effectiveMatterId) {
      const matterRows = await db.execute<{ id: string; status: string }>(
        tenantId,
        `SELECT id, status FROM "Matter" WHERE id = $1`,
        [effectiveMatterId]
      );
      if (matterRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'x-matter-id does not reference an accessible matter.' },
          { status: 400 }
        );
      }
      if (matterRows[0].status === 'CLOSED') {
        return NextResponse.json(
          {
            error: 'CONFLICT',
            code: 'MATTER_CLOSED_READ_ONLY',
            message: 'This matter is closed and cannot accept new documents.',
          },
          { status: 409 }
        );
      }
    }

    // Generated up front (rather than letting Postgres's gen_random_uuid()
    // default assign it) so the object key can incorporate the real
    // DocumentEnvelope id, keeping storage and metadata identifiers in sync.
    const documentId = crypto.randomUUID();
    const objectKey = buildObjectKey(tenantId, documentId, scrubbedFileName);

    const uploadResult = await putObject(objectKey, fileBuffer, fileTypeResult.contentType!);

    const storageStructure = {
      storage_provider: 's3',
      object_key: objectKey,
      content_type: fileTypeResult.contentType,
      bytes_stored: fileBuffer.length,
      etag: uploadResult.etag,
    };

    let envelope;
    try {
      // A single statement — the DocumentEnvelope row and its version-1
      // DocumentVersion row are created atomically (DatabaseClient.execute
      // wraps every query in its own transaction; a CTE keeps both inserts
      // inside that same transaction rather than needing a second one).
      const rows = await db.execute<{
        id: string;
        tenant_id: string;
        case_id: string | null;
        matter_id: string | null;
        created_at: string;
      }>(
        tenantId,
        `WITH envelope AS (
           INSERT INTO "DocumentEnvelope" (id, tenant_id, case_id, matter_id, title, storage_structure, document_type)
           VALUES ($1, $2, $3, $4, $5, $6, $8)
           RETURNING id, tenant_id, case_id, matter_id, created_at
         ), version AS (
           INSERT INTO "DocumentVersion" (tenant_id, envelope_id, version_number, title, storage_structure, created_by)
           SELECT envelope.tenant_id, envelope.id, 1, $5, $6, $7 FROM envelope
         )
         SELECT id, tenant_id, case_id, matter_id, created_at FROM envelope`,
        [documentId, tenantId, rawCaseId ?? null, effectiveMatterId ?? null, scrubbedFileName, storageStructure, session.sub, documentType]
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
      matter_id: envelope.matter_id,
      document_type: documentType,
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
