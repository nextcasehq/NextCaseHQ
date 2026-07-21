import type { ContextItem } from './types';
import { CONTEXT_SOURCES } from './sources';

/**
 * Deterministic assembly only — no LLM call anywhere in this module. Runs
 * every registered ContextSource in parallel and returns the flat,
 * unranked list; rankContextItems() (see ranking.ts) decides what actually
 * reaches a prompt. A Matter that doesn't exist for this tenant (or
 * belongs to another tenant, indistinguishable under RLS) simply produces
 * zero items from every source — existence verification and the resulting
 * 404 are the AI Context Gateway's responsibility (Milestone 2C), not this
 * module's.
 */
export async function buildMatterContext(tenantId: string, matterId: string): Promise<ContextItem[]> {
  const results = await Promise.all(
    CONTEXT_SOURCES.map((source) => source.fetch(tenantId, matterId))
  );
  return results.flat();
}
