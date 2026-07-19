import { DatabaseClient } from '@/lib/db/db-client';
import { hybridSearch } from '../hybrid-search';
import { DEFAULT_PROVIDER_RESULT_LIMIT, type SearchProvider, type SearchProviderOptions, type SearchResultGroup } from './types';

/**
 * Wraps hybridSearch() — the existing, proven RRF-fused vector+full-text
 * document engine — completely UNCHANGED. This provider adds no new
 * ranking or filtering logic of its own; it only adapts hybridSearch()'s
 * existing output shape into a SearchResultGroup and enriches it with the
 * owning DocumentEnvelope's title (hybridSearch() itself returns only
 * envelope_id/chunk_index/content, no title — a separate, RLS-scoped
 * lookup here, not a change to hybridSearch() or DocumentChunkVector).
 *
 * lib/ai/rag.ts continues to call hybridSearch() directly, in-process —
 * it has no dependency on this provider or on search-service.ts.
 */
export const documentSearchProvider: SearchProvider = {
  type: 'DOCUMENT',

  async search(tenantId: string, query: string, options: SearchProviderOptions): Promise<SearchResultGroup> {
    const results = await hybridSearch(tenantId, query, {
      matterId: options.matterId ?? null,
      limit: options.limit ?? DEFAULT_PROVIDER_RESULT_LIMIT,
    });

    if (results.length === 0) {
      return { type: 'DOCUMENT', providerName: 'DocumentSearchProvider', items: [] };
    }

    const envelopeIds = Array.from(new Set(results.map((r) => r.envelope_id)));
    const db = new DatabaseClient();
    const titleRows = await db.execute<{ id: string; title: string }>(
      tenantId,
      `SELECT id, title FROM "DocumentEnvelope" WHERE id = ANY($1::uuid[])`,
      [envelopeIds]
    );
    const titleById = new Map(titleRows.map((row) => [row.id, row.title]));

    return {
      type: 'DOCUMENT',
      providerName: 'DocumentSearchProvider',
      items: results.map((r) => ({
        id: r.id,
        title: titleById.get(r.envelope_id) ?? 'Document',
        snippet: (r.content ?? '').slice(0, 220),
        score: r.score,
        href: `/documents/${r.envelope_id}`,
        metadata: { envelope_id: r.envelope_id, chunk_index: r.chunk_index },
      })),
    };
  },
};
