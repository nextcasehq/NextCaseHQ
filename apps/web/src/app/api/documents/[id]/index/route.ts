import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { indexDocument, DocumentNotFoundError, ObjectStorageNotConfiguredError } from '@/lib/search/indexing';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Triggers (re-)indexing of a single document into DocumentChunkVector.
 * Tenant identity comes only from the verified session cookie; the
 * envelope lookup inside indexDocument() is RLS-scoped, so a document id
 * belonging to another tenant resolves to 404, never a cross-tenant read.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid document id.' }, { status: 400 });
    }

    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
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

    const result = await indexDocument(session.tenantId, id);
    if (result.status === 'SKIPPED') {
      return NextResponse.json({ status: 'SKIPPED', reason: result.reason }, { status: 422 });
    }
    if (result.status === 'FAILED') {
      // A genuine indexing failure (e.g. the embedding provider or storage
      // read errored) — reported honestly, not silently swallowed. The
      // document is left in a FAILED, retryable state (see indexDocument);
      // calling this endpoint again is the retry path.
      return NextResponse.json({ status: 'FAILED', error: result.error }, { status: 502 });
    }
    return NextResponse.json(
      { status: 'INDEXED', chunksIndexed: result.chunksIndexed, provider: result.provider },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (error instanceof ObjectStorageNotConfiguredError) {
      return NextResponse.json({ error: 'OBJECT_STORAGE_NOT_CONFIGURED' }, { status: 503 });
    }
    console.error('[DOCUMENTS_API] POST /api/documents/[id]/index failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
