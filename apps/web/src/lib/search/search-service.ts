import { documentSearchProvider } from './providers/document-search-provider';
import {
  clientSearchProvider,
  courtNoteSearchProvider,
  matterSearchProvider,
  proceedingSearchProvider,
} from './providers/entity-search-provider';
import type { SearchProvider, SearchResultGroup } from './providers/types';

/**
 * The Search Service — Milestone 5's single orchestration entry point,
 * approved as "Option C" (docs/MILESTONE_5_PLAN.md §2): one stable
 * contract (runSearch()), internally dispatching to independently
 * registered SearchProviders. GET /api/search calls this and only this;
 * no consumer talks to a provider directly except lib/ai/rag.ts, which
 * continues to call hybridSearch() directly and has no dependency on this
 * module at all.
 *
 * Providers run in parallel and are isolated from each other's failures —
 * one provider throwing never fails the whole search, it just contributes
 * an empty group, so a structured-entity query problem can never take
 * down document search (or vice versa).
 */

const ALL_PROVIDERS: readonly SearchProvider[] = [
  documentSearchProvider,
  matterSearchProvider,
  proceedingSearchProvider,
  clientSearchProvider,
  courtNoteSearchProvider,
];

export interface RunSearchOptions {
  matterId?: string | null;
  /** Restricts which providers run, by their `type`. Omitted/empty means "all". */
  types?: string[] | null;
  limit?: number;
}

export interface RunSearchResult {
  query: string;
  groups: SearchResultGroup[];
}

export async function runSearch(tenantId: string, query: string, options: RunSearchOptions = {}): Promise<RunSearchResult> {
  const activeProviders =
    options.types && options.types.length > 0
      ? ALL_PROVIDERS.filter((provider) => options.types!.includes(provider.type))
      : ALL_PROVIDERS;

  const groups = await Promise.all(
    activeProviders.map(async (provider): Promise<SearchResultGroup> => {
      try {
        return await provider.search(tenantId, query, { matterId: options.matterId, limit: options.limit });
      } catch (error) {
        console.error(`[SEARCH_SERVICE] provider "${provider.type}" failed, returning an empty group:`, error);
        return { type: provider.type, providerName: provider.type, items: [] };
      }
    })
  );

  return { query, groups };
}

export const SEARCH_PROVIDER_TYPES: readonly string[] = ALL_PROVIDERS.map((provider) => provider.type);
