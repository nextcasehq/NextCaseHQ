/**
 * Shared vocabulary for the Matter Intelligence Layer's context pipeline
 * (Milestone 2A). A ContextSource fetches real data and renders it as
 * ContextItems; rankContextItems() (see ranking.ts) decides what actually
 * reaches a prompt. Nothing in this module or its sources calls an LLM —
 * that only happens later, in the Prompt Builder and Provider Gateway
 * (Milestone 2C).
 */

export const CONTEXT_SOURCE_TYPES = [
  'MATTER_SUMMARY',
  'PROCEEDING',
  'PARTICIPANT',
  'CHRONOLOGY_ENTRY',
] as const;
export type ContextSourceType = (typeof CONTEXT_SOURCE_TYPES)[number];

/**
 * Base priority per source type — the only place a source's default
 * ranking weight is defined. A new source type (Documents, Evidence,
 * Drafts, AI Notes — all reserved, not yet implemented) adds one entry
 * here and to CONTEXT_SOURCE_TYPES, with no change to the ranking
 * algorithm itself. Individual sources may still compute a per-item
 * weight derived from this base (see chronology-source.ts's recency
 * decay) — the interface says "source-defined" deliberately, not a flat
 * constant every item must share.
 */
export const SOURCE_BASE_WEIGHT: Record<ContextSourceType, number> = {
  MATTER_SUMMARY: 100,
  CHRONOLOGY_ENTRY: 70,
  PROCEEDING: 60,
  PARTICIPANT: 40,
};

export interface ContextItem {
  sourceType: ContextSourceType;
  weight: number;
  /** ISO date string — used as a within/across-source tiebreaker, newest first. */
  recency?: string;
  /** Deterministic text rendering for the future Prompt Builder (Milestone 2C). */
  render(): string;
}

export interface ContextSource {
  sourceType: ContextSourceType;
  fetch(tenantId: string, matterId: string): Promise<ContextItem[]>;
}

export interface ContextBudget {
  maxItems?: number;
  maxChars?: number;
}

export interface RankedContext {
  items: ContextItem[];
  truncated: boolean;
}
