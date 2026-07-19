import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
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
  storage_structure: Record<string, unknown>;
  created_at: string;
}

const DOCUMENT_COLUMNS = `id, tenant_id, case_id, matter_id, title, storage_structure, created_at`;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UpdateDocumentSchema = z
  .object({
    case_id: z.string().regex(UUID_PATTERN, 'Invalid case id').nullable(),
    matter_id: z.string().regex(UUID_PATTERN, 'Invalid matter id').nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided.' });

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
      `SELECT ${DOCUMENT_COLUMNS} FROM "DocumentEnvelope" WHERE id = $1`,
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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Malformed JSON body.' }, { status: 400 });
    }

    const result = UpdateDocumentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid update payload.', details: result.error.format() },
        { status: 400 }
      );
    }
    const fields = result.data;
    const db = new DatabaseClient();

    const currentRows = await db.execute<{ case_id: string | null; matter_id: string | null }>(
      session.tenantId,
      `SELECT case_id, matter_id FROM "DocumentEnvelope" WHERE id = $1`,
      [id]
    );
    if (currentRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const effectiveCaseId = Object.prototype.hasOwnProperty.call(fields, 'case_id')
      ? fields.case_id!
      : currentRows[0].case_id;
    const effectiveMatterId = Object.prototype.hasOwnProperty.call(fields, 'matter_id')
      ? fields.matter_id!
      : currentRows[0].matter_id;

    // PostgreSQL foreign key checks always bypass row security by design —
    // these explicit, RLS-scoped SELECTs are what actually enforce tenant
    // ownership before the update is allowed to proceed (same rule as
    // POST /api/documents/upload and every other case_id/matter_id write
    // in this codebase).
    let caseMatterId: string | null = null;
    if (effectiveCaseId) {
      const caseRows = await db.execute<{ id: string; matter_id: string | null }>(
        session.tenantId,
        `SELECT id, matter_id FROM "LegalCase" WHERE id = $1`,
        [effectiveCaseId]
      );
      if (caseRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'case_id does not refer to an accessible case.' },
          { status: 400 }
        );
      }
      caseMatterId = caseRows[0].matter_id;
    }

    if (effectiveMatterId && caseMatterId && effectiveMatterId !== caseMatterId) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          code: 'PROCEEDING_MATTER_MISMATCH',
          message: 'matter_id does not match the parent Matter of the Proceeding referenced by case_id.',
        },
        { status: 400 }
      );
    }

    if (effectiveMatterId) {
      const matterRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "Matter" WHERE id = $1`,
        [effectiveMatterId]
      );
      if (matterRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'matter_id does not refer to an accessible matter.' },
          { status: 400 }
        );
      }
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`"${key}" = $${paramIndex}`);
      values.push(value);
      paramIndex += 1;
    }
    values.push(id);

    const rows = await db.execute<DocumentEnvelopeRow>(
      session.tenantId,
      `UPDATE "DocumentEnvelope" SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING ${DOCUMENT_COLUMNS}`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ document: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('[DOCUMENTS_API] PATCH /api/documents/[id] failed:', error);
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

    // DocumentVersion.envelope_id is RESTRICT, not CASCADE (Sprint 3, PR
    // 3A) — deleting the envelope out from under real, independently
    // stored version objects would either fail outright or (worse, if it
    // were CASCADE) silently orphan every version's storage object. Both
    // deletes run as CTEs inside one statement so they're atomic: either
    // every version row and the envelope go together, or (if some other,
    // future FK — e.g. AiUsageEvent.document_id — still references this
    // envelope) neither does, and no version metadata is lost while its
    // object remains undeleted.
    let rows: {
      id: string;
      envelope_storage: { object_key?: string } | null;
      version_storages: { object_key?: string }[] | null;
    }[];
    try {
      rows = await db.execute(
        session.tenantId,
        `WITH deleted_versions AS (
           DELETE FROM "DocumentVersion" WHERE envelope_id = $1
           RETURNING storage_structure
         ), deleted_envelope AS (
           DELETE FROM "DocumentEnvelope" WHERE id = $1
           RETURNING id, storage_structure
         )
         SELECT
           (SELECT id FROM deleted_envelope) AS id,
           (SELECT storage_structure FROM deleted_envelope) AS envelope_storage,
           (SELECT array_agg(storage_structure) FROM deleted_versions) AS version_storages
         WHERE EXISTS (SELECT 1 FROM deleted_envelope)`,
        [id]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('foreign key constraint')) {
        // Defense in depth: some future reference to this DocumentEnvelope
        // (e.g. AiUsageEvent.document_id) blocks deletion — a deterministic
        // 409, never a raw 500 leaking a Postgres error. No rows were
        // touched (see comment above), so nothing needs to be rolled back.
        return NextResponse.json(
          {
            error: 'CONFLICT',
            code: 'DOCUMENT_HAS_LINKED_RECORDS',
            message: 'This document still has linked records and cannot be deleted.',
          },
          { status: 409 }
        );
      }
      throw error;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    // Metadata rows are already gone; deleting the underlying objects is
    // best-effort — a storage-side failure here shouldn't resurrect
    // records we've already committed to removing. Deduplicated since the
    // initial upload deliberately points version 1 and the envelope at
    // the same object_key.
    const objectKeys = new Set<string>();
    const envelopeKey = rows[0].envelope_storage?.object_key;
    if (envelopeKey) objectKeys.add(envelopeKey);
    for (const version of rows[0].version_storages ?? []) {
      if (version?.object_key) objectKeys.add(version.object_key);
    }
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
