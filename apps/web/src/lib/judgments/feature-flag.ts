'use client';

import { getFeatureFlags } from '@/lib/admin/feature-flags';

export const JUDGMENT_RESEARCH_FLAG_KEY = 'judgment_research';

/**
 * Whether the Judgment Research surface should be shown at all — reads
 * the same admin-configurable feature-flag registry every other flagged
 * feature in this app uses (lib/admin/feature-flags.ts), rather than a
 * parallel on/off mechanism invented for this one feature. Disabled by
 * default: enabling this flag only makes the (placeholder-backed) UI
 * reachable — it does not, by itself, connect any external provider.
 */
export function isJudgmentResearchFeatureEnabled(): boolean {
  const flag = getFeatureFlags().find((f) => f.key === JUDGMENT_RESEARCH_FLAG_KEY);
  return flag?.enabled ?? false;
}
