import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { hybridSearch } from '@/lib/search/hybrid-search';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  case_id: z.string().regex(UUID_PATTERN).optional(),
  matter_id: z.string().regex(UUID_PATTERN).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

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
      case_id: request.nextUrl.searchParams.get('case_id') ?? undefined,
      matter_id: request.nextUrl.searchParams.get('matter_id') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { q, case_id, matter_id, limit, offset } = parsed.data;

    const rows = await hybridSearch(session.tenantId, q, {
      caseId: case_id ?? null,
      matterId: matter_id ?? null,
      limit,
      offset,
    });

    return NextResponse.json({ results: rows, query: q, limit, offset }, { status: 200 });
  } catch (error) {
    console.error('[SEARCH_API] GET /api/search failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
