import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';
import { isObjectStorageConfigured, getObject } from '@/lib/storage/object-storage';

interface DocumentEnvelopeRow {
  id: string;
  title: string;
  storage_structure: { object_key?: string; content_type?: string };
  current_object_key: string | null;
  current_content_type: string | null;
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
    //
    // Downloads always serve the CURRENT version (Sprint 3, PR 3A) — the
    // one with the highest version_number, via a LATERAL join — not the
    // legacy storage_structure JSONB, which only ever describes the
    // original v1 upload and would otherwise silently keep serving stale
    // content forever once a second version exists. The JSONB fields
    // remain a fallback only for a row that somehow has no version at all.
    const rows = await db.execute<DocumentEnvelopeRow>(
      session.tenantId,
      `SELECT de.id, de.title, de.storage_structure,
              dv.object_key AS current_object_key, dv.content_type AS current_content_type
       FROM "DocumentEnvelope" de
       LEFT JOIN LATERAL (
         SELECT object_key, content_type FROM "DocumentVersion"
         WHERE document_id = de.id
         ORDER BY version_number DESC
         LIMIT 1
       ) dv ON true
       WHERE de.id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const envelope = rows[0];
    const objectKey = envelope.current_object_key ?? envelope.storage_structure?.object_key;
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

    const object = await getObject(objectKey);
    return new NextResponse(new Uint8Array(object.buffer), {
      status: 200,
      headers: {
        'Content-Type':
          object.contentType || envelope.current_content_type || envelope.storage_structure?.content_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${envelope.title.replace(/"/g, '')}"`,
        'Content-Length': String(object.buffer.length),
      },
    });
  } catch (error) {
    console.error('[DOCUMENTS_API] GET /api/documents/[id]/download failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
