import { DatabaseClient } from '@/lib/db/db-client';
import { getEmbeddingProvider } from './embedding-provider';
import { toVectorLiteral } from './vector-format';

/**
 * Hybrid document search: vector similarity (pgvector cosine distance) +
 * PostgreSQL full-text search, combined via Reciprocal Rank Fusion (RRF)
 * — a standard, tuning-free hybrid-search technique that avoids having to
 * normalize two differently-scaled scores against each other.
 *
 * Extracted out of the GET /api/search route so the RAG pipeline
 * (lib/ai/rag.ts) can call it directly in-process rather than making an
 * HTTP round-trip to its own API.
 *
 * Tenant-scoped throughout: DatabaseClient.execute binds the session
 * tenant for RLS, and DocumentChunkVector carries its own tenant_id +
 * tenant_isolation_policy (not just the envelope_id FK, which — like every
 * FK — bypasses RLS for referential-integrity checks but must never be
 * trusted alone for isolation).
 */

const DEFAULT_LIMIT = 20;
// Standard RRF constant used across hybrid-search implementations/
// literature; not sensitive to tuning at this stage.
const RRF_K = 60;
const CANDIDATE_POOL_SIZE = 50;

export interface HybridSearchResult {
  id: string;
  envelope_id: string;
  chunk_index: number;
  content: string | null;
  metadata: Record<string, unknown>;
  score: number;
}

export interface HybridSearchOptions {
  caseId?: string | null;
  limit?: number;
  offset?: number;
}

export async function hybridSearch(
  tenantId: string,
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const offset = options.offset ?? 0;
  const caseId = options.caseId ?? null;

  const provider = getEmbeddingProvider();
  const queryVector = toVectorLiteral(await provider.generateEmbedding(query));

  const db = new DatabaseClient();
  return db.execute<HybridSearchResult>(
    tenantId,
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
    [queryVector, caseId, query, limit, CANDIDATE_POOL_SIZE, RRF_K, offset]
  );
}
