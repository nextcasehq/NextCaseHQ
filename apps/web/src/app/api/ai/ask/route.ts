import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { askQuestion } from '@/lib/ai/rag';
import { AIProviderNotConfiguredError, AIProviderRequestError } from '@/lib/ai/errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AskBodySchema = z.object({
  question: z.string().min(1).max(2000),
  case_id: z.string().regex(UUID_PATTERN).optional(),
});

/**
 * RAG answer generation over the tenant's indexed documents (hybrid
 * search from the search milestone). Provider-agnostic: whichever vendor
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

    const result = await askQuestion(session.tenantId, parsed.data.question, parsed.data.case_id ?? null);
    if (result.status === 'NO_CONTEXT_FOUND') {
      return NextResponse.json(
        { status: 'NO_CONTEXT_FOUND', message: 'No indexed documents matched this question.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { status: 'ANSWERED', answer: result.answer, sources: result.sources, provider: result.provider, model: result.model },
      { status: 200 }
    );
  } catch (error) {
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
