import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { isObjectStorageConfigured, putObject, deleteObject } from '@/lib/storage/object-storage';
import { validateFileType, buildVersionObjectKey, MAX_DOCUMENT_SIZE_BYTES } from '@/lib/storage/document-key';

/**
 * DocumentVersion history for a single DocumentEnvelope (Sprint 3, PR 3A).
 *
 * GET lists every version, newest first. POST uploads a new version: a
 * new, independently-addressable storage object (never overwriting a
 * prior version's bytes — see buildVersionObjectKey) plus a new
 * DocumentVersion row, with DocumentEnvelope's own title/storage_structure
 * updated to match so every pre-existing reader (download, index, list,
 * GET /api/documents/[id]) transparently sees the current version without
 * any change to those routes.
 */

interface DocumentVersionRow {
  id: string;
  envelope_id: string;
  version_number: number;
  title: string;
  storage_structure: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveSession(request: NextRequest) {
  try {
    return await requireSession(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    throw error;
  }
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid document id.' }, { status: 400 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const db = new DatabaseClient();
    // RLS scopes both queries to the caller's own tenant — a document
    // belonging to another tenant is indistinguishable from a nonexistent
    // one (404), same rule as every other document route.
    const envelopeRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "DocumentEnvelope" WHERE id = $1`,
      [id]
    );
    if (envelopeRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const versions = await db.execute<DocumentVersionRow>(
      session.tenantId,
      `SELECT id, envelope_id, version_number, title, storage_structure, created_by, created_at
       FROM "DocumentVersion"
       WHERE envelope_id = $1
       ORDER BY version_number DESC`,
      [id]
    );

    return NextResponse.json({ envelope_id: id, versions }, { status: 200 });
  } catch (error) {
    console.error('[DOCUMENTS_API] GET /api/documents/[id]/versions failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid document id.' }, { status: 400 });
    }

    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }
    const tenantId = session.tenantId;

    if (!isObjectStorageConfigured()) {
      return NextResponse.json(
        { error: 'OBJECT_STORAGE_NOT_CONFIGURED', message: 'Object storage is not configured on this server.' },
        { status: 503 }
      );
    }

    const db = new DatabaseClient();
    // RLS-scoped existence check up front — a document belonging to
    // another tenant returns 404 here, before any storage write happens.
    const envelopeRows = await db.execute<{ id: string }>(
      tenantId,
      `SELECT id FROM "DocumentEnvelope" WHERE id = $1`,
      [id]
    );
    if (envelopeRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
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
      if (totalBytesReceived > MAX_DOCUMENT_SIZE_BYTES) {
        return NextResponse.json({ error: 'BAD_REQUEST', message: 'File exceeds the maximum allowed size.' }, { status: 413 });
      }
      chunks.push(value);
    }
    const fileBuffer = Buffer.concat(chunks);
    if (fileBuffer.length === 0) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Empty file body.' }, { status: 400 });
    }

    // The next version number is computed and consumed inside the same
    // statement as the insert (a CTE), so two concurrent uploads for the
    // same document can't both compute the same "next" number — the
    // second writer hits the (envelope_id, version_number) unique
    // constraint instead of silently overwriting the first.
    const objectKey = buildVersionObjectKey(tenantId, id, crypto.randomUUID(), rawFileName);
    const uploadResult = await putObject(objectKey, fileBuffer, fileTypeResult.contentType!);
    const storageStructure = {
      storage_provider: 's3',
      object_key: objectKey,
      content_type: fileTypeResult.contentType,
      bytes_stored: fileBuffer.length,
      etag: uploadResult.etag,
    };

    let version: DocumentVersionRow;
    try {
      const rows = await db.execute<DocumentVersionRow>(
        tenantId,
        `WITH next_version AS (
           SELECT COALESCE(MAX(version_number), 0) + 1 AS v FROM "DocumentVersion" WHERE envelope_id = $1
         ), inserted AS (
           INSERT INTO "DocumentVersion" (tenant_id, envelope_id, version_number, title, storage_structure, created_by)
           SELECT $2, $1, next_version.v, $3, $4, $5 FROM next_version
           RETURNING id, envelope_id, version_number, title, storage_structure, created_by, created_at
         ), touched_envelope AS (
           UPDATE "DocumentEnvelope" SET title = $3, storage_structure = $4 WHERE id = $1
         )
         SELECT * FROM inserted`,
        [id, tenantId, rawFileName, storageStructure, session.sub]
      );
      if (rows.length === 0) {
        // A concurrent upload for this same document won the unique
        // (envelope_id, version_number) race between our SELECT and INSERT.
        throw new Error('DOCUMENT_VERSION_CONFLICT');
      }
      version = rows[0];
    } catch (dbError) {
      // The object is already durably stored — if the metadata row fails
      // to save, clean up the now-orphaned object rather than leaking
      // storage with no DB record pointing at it.
      await deleteObject(objectKey).catch(() => {});
      const message = dbError instanceof Error ? dbError.message : '';
      if (message.includes('DOCUMENT_VERSION_CONFLICT') || message.includes('duplicate key value')) {
        return NextResponse.json(
          { error: 'CONFLICT', message: 'A concurrent upload already created this version. Retry.' },
          { status: 409 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({ version, bytes_received: totalBytesReceived }, { status: 201 });
  } catch (error) {
    console.error('[DOCUMENTS_API] POST /api/documents/[id]/versions failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
