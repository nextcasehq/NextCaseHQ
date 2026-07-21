import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { createDraft } from '@/lib/documents/draft-store';
import { isValidDocumentTypeSlug } from '@/lib/domain/document-type';

/**
 * Document Creator Phase 2 — Durable Draft and Continuous Autosave.
 * Creates the durable working-draft record an advocate's typed content is
 * autosaved into (docs/document-creator/DOCUMENT_AUTOSAVE_SPECIFICATION.md).
 * Deliberately the only write this route performs — it never creates a
 * DocumentEnvelope/DocumentVersion; promoting a draft into a permanent
 * version is Phase 3 scope.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CreateDraftSchema = z.object({
  matter_id: z.string().regex(UUID_PATTERN).nullable().optional(),
  document_type: z.string().nullable().optional(),
  title: z.string().max(500).nullable().optional(),
  content: z.string().max(200000).default(''),
});

export async function POST(request: NextRequest) {
  try {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Malformed JSON body.' }, { status: 400 });
    }

    const parsed = CreateDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid draft payload.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    if (input.document_type && !isValidDocumentTypeSlug(input.document_type)) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: `Unrecognized document_type: ${input.document_type}` },
        { status: 400 }
      );
    }

    // A FK check alone bypasses RLS (the same lesson recorded throughout
    // db/schema.sql) — explicitly verify the Matter is actually in this
    // tenant before letting it be attached to the draft.
    if (input.matter_id) {
      const db = new DatabaseClient();
      const matterRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "Matter" WHERE id = $1`,
        [input.matter_id]
      );
      if (matterRows.length === 0) {
        return NextResponse.json({ error: 'NOT_FOUND', message: 'Matter not found.' }, { status: 404 });
      }
    }

    const draft = await createDraft(session.tenantId, session.sub, {
      matterId: input.matter_id ?? null,
      documentType: input.document_type ?? null,
      title: input.title ?? null,
      content: input.content,
    });

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error('[DOCUMENT_DRAFTS_API] POST failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
