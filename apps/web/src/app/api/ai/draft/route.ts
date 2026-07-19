import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { generateDraft } from '@/lib/ai/draft';
import { AIProviderNotConfiguredError, AIProviderRequestError } from '@/lib/ai/errors';
import { MatterNotFoundError, EntitlementDeniedError } from '@/lib/ai/context/gateway';
import { DOCUMENT_CATEGORIES, getDocumentType } from '@/lib/domain/document-type';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DraftBodySchema = z
  .object({
    document_type: z.string().min(1),
    category: z.enum(DOCUMENT_CATEGORIES),
    matter_id: z.string().regex(UUID_PATTERN).optional(),
    facts: z.record(z.string(), z.string().max(5000)).default({}),
    mode: z.enum(['CREATE', 'IMPROVE']),
    existing_content: z.string().max(50000).optional(),
    improve_instruction: z.string().max(2000).optional(),
  })
  .refine((data) => data.mode !== 'IMPROVE' || !!data.existing_content, {
    message: 'existing_content is required when mode is IMPROVE.',
    path: ['existing_content'],
  });

/**
 * DRAFT_CREATE / DRAFT_IMPROVE generation (Milestone 4, Prepare Document).
 * Mirrors POST /api/ai/ask's exact security/pipeline shape — see
 * lib/ai/draft.ts for the shared pipeline itself.
 *
 * Deliberately the ONLY endpoint this milestone adds: it never writes a
 * DocumentEnvelope/DocumentVersion row. Saving a reviewed draft is a
 * separate, explicit client action against the existing
 * POST /api/documents/upload (new document) or
 * POST /api/documents/[id]/versions (revision) endpoints.
 */
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

    const parsed = DraftBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid request body.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const documentType = getDocumentType(data.document_type);
    if (!documentType) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: `Unrecognized document_type: ${data.document_type}` },
        { status: 400 }
      );
    }
    if (documentType.category !== data.category) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: `${documentType.label} does not belong to category ${data.category}.` },
        { status: 400 }
      );
    }

    const result = await generateDraft({
      tenantId: session.tenantId,
      userId: session.sub,
      documentTypeSlug: data.document_type,
      category: data.category,
      facts: data.facts,
      matterId: data.matter_id ?? null,
      mode: data.mode,
      existingContent: data.existing_content ?? null,
      improveInstruction: data.improve_instruction ?? null,
    });

    return NextResponse.json(
      { status: 'GENERATED', content: result.content, provider: result.provider, model: result.model },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof MatterNotFoundError) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Matter not found.' }, { status: 404 });
    }
    if (error instanceof EntitlementDeniedError) {
      return NextResponse.json({ error: 'ENTITLEMENT_DENIED', message: error.reason }, { status: 403 });
    }
    if (error instanceof AIProviderNotConfiguredError) {
      return NextResponse.json({ error: 'AI_PROVIDER_NOT_CONFIGURED' }, { status: 503 });
    }
    if (error instanceof AIProviderRequestError) {
      return NextResponse.json({ error: 'AI_PROVIDER_REQUEST_FAILED' }, { status: 502 });
    }
    console.error('[AI_API] POST /api/ai/draft failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
