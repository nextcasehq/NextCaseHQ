import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { isObjectStorageConfigured, putObject, deleteObject } from '@/lib/storage/object-storage';
import { validateFileType, buildObjectKey } from '@/lib/storage/document-key';

/**
 * Version history for a Document (Sprint 3, PR 3A). DocumentVersion rows
 * are immutable once created — POST always creates the NEXT version, never
 * edits an existing one; a prior version's stored object is never
 * overwritten or deleted. There is no current_version_id pointer — the
 * current version is simply whichever has the highest version_number for
 * this document_id (see db/schema.sql).
 */

const MAX_DOCUMENT_SIZE = 128 * 1024 * 1024; // 128MB, matches the initial-upload limit
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DocumentVersionRow {
  id: string;
  version_number: number;
  content_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
}

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
    // RLS scopes this to the caller's own tenant — a document id belonging
    // to another tenant returns 404, never a cross-tenant read, same as
    // every other document route.
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
      `SELECT id, version_number, content_type, size_bytes, uploaded_by, created_at
       FROM "DocumentVersion"
       WHERE document_id = $1
       ORDER BY version_number DESC`,
      [id]
    );

    return NextResponse.json({ versions }, { status: 200 });
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

    const rawFileName = request.headers.get('x-file-name') || '';
    if (!rawFileName) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'x-file-name is required.' }, { status: 400 });
    }
    const fileTypeResult = validateFileType(rawFileName);
    if (!fileTypeResult.valid) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: fileTypeResult.reason }, { status: 400 });
    }

    if (!request.body) return NextResponse.json({ error: 'BAD_REQUEST', message: 'Empty request body.' }, { status: 400 });

    const db = new DatabaseClient();
    // RLS-scoped existence check before any bytes are read — a document id
    // belonging to another tenant (or none) never even reaches storage.
    const envelopeRows = await db.execute<{ id: string }>(
      tenantId,
      `SELECT id FROM "DocumentEnvelope" WHERE id = $1`,
      [id]
    );
    if (envelopeRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const maxVersionRows = await db.execute<{ max_version: number | null }>(
      tenantId,
      `SELECT MAX(version_number) AS max_version FROM "DocumentVersion" WHERE document_id = $1`,
      [id]
    );
    const nextVersionNumber = (maxVersionRows[0].max_version ?? 0) + 1;

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytesReceived = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytesReceived += value.length;
      if (totalBytesReceived > MAX_DOCUMENT_SIZE) {
        return NextResponse.json(
          { error: 'INGESTION_FAILURE', reason: 'SIZE_EXCEEDED', status: 'ABORTED' },
          { status: 413 }
        );
      }
      chunks.push(value);
    }
    const fileBuffer = Buffer.concat(chunks);
    if (fileBuffer.length === 0) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Empty file body.' }, { status: 400 });
    }

    // A version's own key, not the original upload's — the prior version's
    // object at its own v{n} key is left completely untouched.
    const objectKey = buildObjectKey(tenantId, id, rawFileName, nextVersionNumber);
    const uploadResult = await putObject(objectKey, fileBuffer, fileTypeResult.contentType!);

    // No current_version_id pointer to update — the current version is
    // simply whichever has the highest version_number for this document_id
    // (see db/schema.sql), so creating the version row is the entire write.
    let version: DocumentVersionRow & { document_id: string };
    try {
      const rows = await db.execute<DocumentVersionRow & { document_id: string }>(
        tenantId,
        `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes, etag, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, document_id, version_number, content_type, size_bytes, uploaded_by, created_at`,
        [
          tenantId,
          id,
          nextVersionNumber,
          objectKey,
          fileTypeResult.contentType,
          fileBuffer.length,
          uploadResult.etag ?? null,
          session.sub,
        ]
      );
      version = rows[0];
    } catch (dbError) {
      await deleteObject(objectKey).catch(() => {});
      throw dbError;
    }

    return NextResponse.json(
      {
        status: 'ACCEPTED',
        id: version.id,
        document_id: version.document_id,
        version_number: version.version_number,
        bytes_received: totalBytesReceived,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[DOCUMENTS_API] POST /api/documents/[id]/versions failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
