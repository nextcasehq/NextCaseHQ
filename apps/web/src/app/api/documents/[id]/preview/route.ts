import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';
import { isObjectStorageConfigured, getObject } from '@/lib/storage/object-storage';
import { isPreviewEligible } from '@/lib/storage/document-key';
import { recordDocumentAccessEvent, extractCorrelationId } from '@/lib/documents/access-audit';

/**
 * Secure Document Preview Foundation (Sprint 3B, PR 3B-2).
 *
 * Deliberately the same authorization and proxy model as
 * GET /api/documents/[id]/download, applied a second time — not a new
 * mechanism: requireSession() then an RLS-scoped SELECT on
 * DocumentEnvelope, then a server-side read of the object bytes via
 * getObject(). Storage-provider URLs/keys are never returned to the
 * caller in any response, success or failure; only the app itself ever
 * talks to storage (Product Owner Decision 2 — application-proxy
 * streaming, no signed URLs).
 *
 * Differs from /download only in: (1) gating on content-type eligibility
 * before touching storage — DOC/DOCX get an explicit, testable
 * "unsupported preview" response rather than inline bytes (Decision 3),
 * (2) Content-Disposition: inline instead of attachment, (3) a
 * Cache-Control header, and (4) recording a durable, append-only
 * DocumentAccessEvent row on every real preview (Decision 4).
 */

interface DocumentEnvelopeRow {
  id: string;
  title: string;
  storage_structure: { object_key?: string; content_type?: string } | null;
}

interface CurrentVersionRow {
  id: string;
  version_number: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREVIEW_CACHE_CONTROL = 'private, max-age=300';

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
    // RLS scopes this to the caller's own tenant — a document belonging
    // to a different tenant returns zero rows here, and storage is never
    // even touched. Ownership is re-verified on every single request;
    // nothing about a prior successful preview is cached or trusted.
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

    const contentType = envelope.storage_structure?.content_type ?? null;
    if (!isPreviewEligible(contentType)) {
      return NextResponse.json(
        {
          error: 'UNSUPPORTED_MEDIA_TYPE',
          code: 'PREVIEW_UNSUPPORTED_FILE_TYPE',
          message: `Preview is not supported for ${contentType ?? 'this file type'}. Use GET /api/documents/${id}/download instead.`,
        },
        { status: 415 }
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
      // The metadata row exists and named an eligible content type, but
      // the underlying object itself is gone or unreadable — distinct
      // from "never had one" above, so an operator can tell orphan
      // detection apart from a genuine bug.
      console.error('[DOCUMENTS_API] GET /api/documents/[id]/preview failed to read stored object:', error);
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
      action: 'PREVIEW',
      correlationId: extractCorrelationId(request),
    });

    return new NextResponse(new Uint8Array(object.buffer), {
      status: 200,
      headers: {
        'Content-Type': object.contentType || contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${envelope.title.replace(/"/g, '')}"`,
        'Content-Length': String(object.buffer.length),
        'Cache-Control': PREVIEW_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error('[DOCUMENTS_API] GET /api/documents/[id]/preview failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
