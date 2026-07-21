import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { getDraft, autosaveDraft, DraftNotFoundError, DraftRevisionConflictError } from '@/lib/documents/draft-store';

/**
 * Document Creator Phase 2 — Durable Draft and Continuous Autosave.
 * GET recovers the durable draft (server-side Tier 2 recovery — refresh,
 * crash, different device). PATCH is the debounced autosave write itself,
 * revision-guarded for optimistic concurrency per
 * docs/document-creator/DOCUMENT_AUTOSAVE_SPECIFICATION.md's "Concurrency
 * Control" section — see lib/documents/draft-store.ts for the
 * compare-and-swap this route relies on.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AutosaveDraftSchema = z.object({
  content: z.string().max(200000),
  title: z.string().max(500).nullable().optional(),
  expected_revision: z.number().int().positive(),
});

type RouteParams = { params: Promise<{ id: string }> };

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid draft id.' }, { status: 400 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const draft = await getDraft(session.tenantId, session.sub, id);
    return NextResponse.json({ draft }, { status: 200 });
  } catch (error) {
    if (error instanceof DraftNotFoundError) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Draft not found.' }, { status: 404 });
    }
    console.error('[DOCUMENT_DRAFTS_API] GET failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid draft id.' }, { status: 400 });
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

    const parsed = AutosaveDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid autosave payload.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const draft = await autosaveDraft(session.tenantId, session.sub, id, {
      content: input.content,
      title: input.title ?? null,
      expectedRevision: input.expected_revision,
    });

    return NextResponse.json({ draft }, { status: 200 });
  } catch (error) {
    if (error instanceof DraftNotFoundError) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Draft not found.' }, { status: 404 });
    }
    if (error instanceof DraftRevisionConflictError) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          code: 'REVISION_CONFLICT',
          message: 'This draft was updated elsewhere since it was last loaded.',
          current: error.current,
        },
        { status: 409 }
      );
    }
    console.error('[DOCUMENT_DRAFTS_API] PATCH failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
