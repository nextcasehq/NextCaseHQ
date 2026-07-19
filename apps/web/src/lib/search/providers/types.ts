/**
 * The SearchProvider interface — Milestone 5's Search Service abstraction,
 * following the same "no hardcoded implementation at the call site" shape
 * already proven three times in this codebase (lib/ai/llm-provider.ts,
 * lib/billing/payment-provider.ts, lib/search/embedding-provider.ts).
 *
 * A provider's `score` is meaningful only within its own result set —
 * DocumentSearchProvider's RRF-fused vector+FTS score and
 * EntitySearchProvider's trigram-similarity score are never compared
 * against each other. search-service.ts returns one SearchResultGroup per
 * provider rather than a single merged/re-ranked list, by design (see
 * docs/MILESTONE_5_PLAN.md §2.2).
 */

export interface SearchResultItem {
  id: string;
  title: string;
  snippet: string;
  /** Only comparable to other items from the same provider — see module doc above. */
  score: number;
  /** Empty string when no dedicated page exists yet for this entity (e.g. Client) — callers must render conditionally. */
  href: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResultGroup {
  type: string;
  providerName: string;
  items: SearchResultItem[];
}

export interface SearchProviderOptions {
  matterId?: string | null;
  limit?: number;
}

export interface SearchProvider {
  readonly type: string;
  search(tenantId: string, query: string, options: SearchProviderOptions): Promise<SearchResultGroup>;
}

export const DEFAULT_PROVIDER_RESULT_LIMIT = 10;
