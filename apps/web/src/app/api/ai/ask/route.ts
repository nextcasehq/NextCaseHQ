import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { askQuestion } from '@/lib/ai/rag';
import { AIProviderNotConfiguredError, AIProviderRequestError } from '@/lib/ai/errors';
import { MatterNotFoundError, EntitlementDeniedError } from '@/lib/ai/context/gateway';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AskBodySchema = z.object({
  question: z.string().min(1).max(2000),
  case_id: z.string().regex(UUID_PATTERN).optional(),
  matter_id: z.string().regex(UUID_PATTERN).optional(),
});

/**
 * RAG answer generation over the tenant's indexed documents (hybrid
 * search from the search milestone), optionally enriched with a Matter's
 * real structured context (Matter Intelligence Layer, Milestone 2) when
 * matter_id is given — additive and backward compatible: omitting it
 * preserves the exact prior behavior. Provider-agnostic: whichever vendor
 * AI_PROVIDER selects (openai by default, anthropic as the second
 * supported option) is invoked through lib/ai/llm-provider.ts — this
 * route never touches a vendor SDK directly.
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

    const parsed = AskBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid request body.', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await askQuestion(session.tenantId, session.sub, parsed.data.question, {
      caseId: parsed.data.case_id ?? null,
      matterId: parsed.data.matter_id ?? null,
    });
    if (result.status === 'NO_CONTEXT_FOUND') {
      return NextResponse.json(
        { status: 'NO_CONTEXT_FOUND', message: 'No indexed documents matched this question.' },
        { status: 422 }
      );
    }

    // estimated_provider_tokens/estimated_cost_usd are deliberately never
    // surfaced here (Milestone 2, Decision 7) — customers see operation
    // costs and NextCase Credits once billing exists, never raw
    // model-specific token counts.
    return NextResponse.json(
      { status: 'ANSWERED', answer: result.answer, sources: result.sources, provider: result.provider, model: result.model },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof MatterNotFoundError) {
      // RLS-indistinguishable from a cross-tenant matter_id — 404, not a
      // permission leak, matching every other Matter-scoped route.
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
    console.error('[AI_API] POST /api/ai/ask failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
