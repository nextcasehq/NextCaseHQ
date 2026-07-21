import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';
import { isObjectStorageConfigured, getObject } from '@/lib/storage/object-storage';
import { recordDocumentAccessEvent, extractCorrelationId } from '@/lib/documents/access-audit';

interface DocumentEnvelopeRow {
  id: string;
  title: string;
  storage_structure: { object_key?: string; content_type?: string };
}

interface CurrentVersionRow {
  id: string;
  version_number: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid document id.' }, { status: 400 });
    }

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

    const db = new DatabaseClient();
    // RLS scopes this to the caller's own tenant, exactly like every
    // other document/case route — a document belonging to a different
    // tenant returns zero rows here, and storage is never even touched.
    const rows = await db.execute<DocumentEnvelopeRow>(
      session.tenantId,
      `SELECT id, title, storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const envelope = rows[0];
    const objectKey = envelope.storage_structure?.object_key;
    if (!objectKey) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'This document has no stored file content.' },
        { status: 404 }
      );
    }

    if (!isObjectStorageConfigured()) {
      return NextResponse.json(
        { error: 'OBJECT_STORAGE_NOT_CONFIGURED', message: 'Object storage is not configured on this server.' },
        { status: 503 }
      );
    }

    let object;
    try {
      object = await getObject(objectKey);
    } catch (error) {
      // The metadata row exists, but the underlying object itself is gone
      // or unreadable — distinct from "never had one" above, so an
      // operator can tell orphan detection apart from a genuine bug
      // (Sprint 3B, PR 3B-2 — same failure state /preview uses).
      console.error('[DOCUMENTS_API] GET /api/documents/[id]/download failed to read stored object:', error);
      return NextResponse.json(
        { error: 'NOT_FOUND', code: 'DOCUMENT_OBJECT_MISSING', message: 'The stored file content could not be read.' },
        { status: 404 }
      );
    }

    const versionRows = await db.execute<CurrentVersionRow>(
      session.tenantId,
      `SELECT id, version_number FROM "DocumentVersion" WHERE envelope_id = $1 ORDER BY version_number DESC LIMIT 1`,
      [id]
    );
    const currentVersion = versionRows[0] ?? null;

    await recordDocumentAccessEvent({
      tenantId: session.tenantId,
      userId: session.sub,
      envelopeId: id,
      versionId: currentVersion?.id ?? null,
      versionNumber: currentVersion?.version_number ?? null,
      action: 'DOWNLOAD',
      correlationId: extractCorrelationId(request),
    });

    return new NextResponse(new Uint8Array(object.buffer), {
      status: 200,
      headers: {
        'Content-Type': object.contentType || envelope.storage_structure.content_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${envelope.title.replace(/"/g, '')}"`,
        'Content-Length': String(object.buffer.length),
      },
    });
  } catch (error) {
    console.error('[DOCUMENTS_API] GET /api/documents/[id]/download failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
