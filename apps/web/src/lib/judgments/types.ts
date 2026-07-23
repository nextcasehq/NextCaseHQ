/**
 * Judgment Research — core domain models. These are shared by every
 * JudgmentProvider implementation, the orchestration service, and the AI
 * retrieval layer, so none of them need to agree on a shape separately.
 *
 * No provider is connected yet — see providers/placeholder-provider.ts.
 * These types exist so that connecting one later is a matter of
 * implementing JudgmentProvider (providers/types.ts) against this same
 * shape, not inventing a new contract.
 */

export interface JudgmentSearchRequest {
  query: string;
  tenantId: string;
  userId: string;
  limit?: number;
  court?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** A citation as it would appear in a judgment, e.g. "AIR 1973 SC 1461". */
export interface Citation {
  raw: string;
  reporter?: string;
  year?: number;
  volume?: string;
  page?: string;
}

export interface JudgmentDocument {
  id: string;
  title: string;
  court: string;
  bench?: string;
  decidedOn?: string;
  citations: Citation[];
  snippet: string;
  sourceUrl: string;
  /** Which provider produced this document — required for attribution
   * and for auditing which source informed an AI answer. */
  provider: string;
}

export type JudgmentSearchStatus = 'ok' | 'unavailable' | 'error';

export interface JudgmentSearchResult {
  status: JudgmentSearchStatus;
  query: string;
  /** The provider id that produced this result — 'none' only when the
   * request never reached a provider (e.g. entitlement denied it). */
  provider: string;
  documents: JudgmentDocument[];
  /** Human-readable status message — always present when status is not
   * 'ok', so the UI never has to guess what to show. */
  message?: string;
}
