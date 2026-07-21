import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { deleteObject } from '@/lib/storage/object-storage';

interface DocumentEnvelopeRow {
  id: string;
  tenant_id: string;
  case_id: string | null;
  matter_id: string | null;
  title: string;
  category: string;
  status: string;
  storage_structure: Record<string, unknown>;
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
    // RLS scopes this to the caller's own tenant — a valid UUID belonging
    // to another tenant returns zero rows here, not a permission leak.
    const rows = await db.execute<DocumentEnvelopeRow>(
      session.tenantId,
      `SELECT id, tenant_id, case_id, matter_id, title, category, status, storage_structure, created_at
       FROM "DocumentEnvelope"
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ document: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[DOCUMENTS_API] GET /api/documents/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const db = new DatabaseClient();

    // Every version's object key must be captured BEFORE the DocumentEnvelope
    // row is deleted — DocumentVersion rows cascade away with it (Sprint 3,
    // PR 3A), so this is the last point at which they're queryable. A
    // pre-versioning row (whose object key lives only in the legacy
    // storage_structure JSONB) is also covered as a fallback.
    const versionRows = await db.execute<{ object_key: string }>(
      session.tenantId,
      `SELECT object_key FROM "DocumentVersion" WHERE document_id = $1`,
      [id]
    );

    const rows = await db.execute<{ id: string; storage_structure: { object_key?: string } }>(
      session.tenantId,
      `DELETE FROM "DocumentEnvelope" WHERE id = $1 RETURNING id, storage_structure`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    // Metadata row is already gone; deleting the underlying objects is
    // best-effort — a storage-side failure here shouldn't resurrect a
    // record we've already committed to removing.
    const objectKeys = new Set(versionRows.map((v) => v.object_key));
    const legacyObjectKey = rows[0].storage_structure?.object_key;
    if (legacyObjectKey) objectKeys.add(legacyObjectKey);

    await Promise.all(
      Array.from(objectKeys).map((key) =>
        deleteObject(key).catch((err) => {
          console.error('[DOCUMENTS_API] Failed to delete underlying object after DB delete:', err);
        })
      )
    );

    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (error) {
    console.error('[DOCUMENTS_API] DELETE /api/documents/[id] failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
