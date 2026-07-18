import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';
import { getEmbeddingProvider } from '@/lib/search/embedding-provider';
import { toVectorLiteral } from '@/lib/search/vector-format';

/**
 * Hybrid document search: vector similarity (pgvector cosine distance) +
 * PostgreSQL full-text search, combined via Reciprocal Rank Fusion (RRF)
 * — a standard, tuning-free hybrid-search technique that avoids having to
 * normalize two differently-scaled scores against each other.
 *
 * Tenant-scoped throughout: DatabaseClient.execute binds the session
 * tenant for RLS, and DocumentChunkVector carries its own tenant_id +
 * tenant_isolation_policy (not just the envelope_id FK, which — like every
 * FK — bypasses RLS for referential-integrity checks but must never be
 * trusted alone for isolation).
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
// Standard RRF constant used across hybrid-search implementations/
// literature; not sensitive to tuning at this stage.
const RRF_K = 60;
const CANDIDATE_POOL_SIZE = 50;

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  case_id: z.string().regex(UUID_PATTERN).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

interface SearchResultRow {
  id: string;
  envelope_id: string;
  chunk_index: number;
  content: string | null;
  metadata: Record<string, unknown>;
  score: number;
}

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
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { q, case_id, limit, offset } = parsed.data;

    const provider = getEmbeddingProvider();
    const queryVector = toVectorLiteral(await provider.generateEmbedding(q));

    const db = new DatabaseClient();
    const rows = await db.execute<SearchResultRow>(
      session.tenantId,
      `WITH vector_ranked AS (
         SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rnk
         FROM "DocumentChunkVector"
         WHERE embedding IS NOT NULL
           AND ($2::uuid IS NULL OR envelope_id IN (SELECT id FROM "DocumentEnvelope" WHERE case_id = $2))
         ORDER BY embedding <=> $1::vector
         LIMIT $5
       ),
       fts_ranked AS (
         SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(content_tsv, plainto_tsquery('english', $3)) DESC) AS rnk
         FROM "DocumentChunkVector"
         WHERE content_tsv @@ plainto_tsquery('english', $3)
           AND ($2::uuid IS NULL OR envelope_id IN (SELECT id FROM "DocumentEnvelope" WHERE case_id = $2))
         ORDER BY ts_rank(content_tsv, plainto_tsquery('english', $3)) DESC
         LIMIT $5
       ),
       fused AS (
         SELECT COALESCE(v.id, f.id) AS id,
                (COALESCE(1.0 / ($6 + v.rnk), 0) + COALESCE(1.0 / ($6 + f.rnk), 0)) AS score
         FROM vector_ranked v
         FULL OUTER JOIN fts_ranked f ON v.id = f.id
       )
       SELECT c.id, c.envelope_id, c.chunk_index, c.content, c.metadata, fused.score
       FROM fused
       JOIN "DocumentChunkVector" c ON c.id = fused.id
       ORDER BY fused.score DESC
       LIMIT $4 OFFSET $7`,
      [queryVector, case_id ?? null, q, limit, CANDIDATE_POOL_SIZE, RRF_K, offset]
    );

    return NextResponse.json({ results: rows, query: q, limit, offset }, { status: 200 });
  } catch (error) {
    console.error('[SEARCH_API] GET /api/search failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
