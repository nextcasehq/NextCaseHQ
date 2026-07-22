import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { searchJudgments } from '@/lib/judgments/judgment-research-service';

const JudgmentSearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/**
 * Judgment Research — architecture-only milestone. This route calls
 * searchJudgments() and only searchJudgments(), the same "one stable
 * HTTP contract, dispatch internally" shape as GET /api/search
 * (docs/MILESTONE_5_PLAN.md §2). No provider name is referenced here —
 * only the placeholder provider is registered today, so every response
 * has status "unavailable" until a real provider is connected via
 * configuration (see lib/judgments/config.ts, registry.ts).
 */
export async function GET(request: NextRequest) {
  try {
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

    const parsed = JudgmentSearchQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { q, limit } = parsed.data;

    const result = await searchJudgments({
      query: q,
      tenantId: session.tenantId,
      userId: session.sub,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[JUDGMENT_RESEARCH_API] GET /api/judgments/search failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
