/**
 * Lightweight tagged logging, matching the existing [SEARCH_API] / [AUDIT]
 * console-tag convention already used elsewhere in this codebase (see
 * app/api/search/route.ts, lib/audit/logger.ts) rather than introducing a
 * new logging framework for this milestone.
 */

export function logJudgmentResearchEvent(message: string, meta?: Record<string, unknown>): void {
  console.log(`[JUDGMENT_RESEARCH] ${message}`, meta ?? '');
}

export function logJudgmentResearchError(message: string, error: unknown): void {
  console.error(`[JUDGMENT_RESEARCH] ${message}`, error);
}
