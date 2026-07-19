import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { runSearch, SEARCH_PROVIDER_TYPES } from '@/lib/search/search-service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  matter_id: z.string().regex(UUID_PATTERN).optional(),
  // Comma-separated provider types (e.g. "document,proceeding,court_note").
  // Validated against the Search Service's own registered provider list
  // (SEARCH_PROVIDER_TYPES) rather than a separately-maintained enum, so
  // the two can never drift — a future provider registration automatically
  // becomes a valid filter value with no change here.
  type: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean) : undefined))
    .refine((types) => !types || types.every((t) => SEARCH_PROVIDER_TYPES.includes(t)), {
      message: `type must be a comma-separated list drawn from: ${SEARCH_PROVIDER_TYPES.join(', ')}`,
    }),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
});

/**
 * Universal Search (Product Direction, Milestone 5) — the single, stable
 * HTTP contract for the approved "Option C" Search Service architecture
 * (docs/MILESTONE_5_PLAN.md §2). Calls runSearch() and only runSearch();
 * every provider (documents, Matters, Proceedings, Clients, Court Notes,
 * and any future provider — citations, AI-assisted search, etc.) is
 * reached through this one route with no contract change required to add
 * one. Read-only; no new mutation surface.
 *
 * lib/ai/rag.ts does NOT call this route — it calls hybridSearch()
 * directly, in-process, and is completely unaffected by this milestone.
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

    const parsed = SearchQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      matter_id: request.nextUrl.searchParams.get('matter_id') ?? undefined,
      type: request.nextUrl.searchParams.get('type') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { q, matter_id, type, limit } = parsed.data;

    const result = await runSearch(session.tenantId, q, {
      matterId: matter_id ?? null,
      types: type ?? null,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[SEARCH_API] GET /api/search failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
