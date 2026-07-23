import type { JudgmentSearchRequest, JudgmentSearchResult } from '../types';

/**
 * The one interface every judgment source implements. Nothing outside
 * this directory ever imports a concrete provider — every call site
 * (the orchestration service, the AI retrieval layer, any future UI)
 * depends only on this shape, exactly mirroring the SearchProvider /
 * LLMProvider / PaymentProvider pattern already used elsewhere in this
 * codebase (lib/search/providers/types.ts, lib/ai/types.ts,
 * lib/billing/payment-provider.ts).
 *
 * Connecting a real provider later means: implement this interface,
 * register it in ../registry.ts, and select it via ../config.ts — no
 * change to the service, the AI layer, or any UI that already calls
 * searchJudgments().
 */
export interface JudgmentProvider {
  readonly id: string;
  readonly displayName: string;
  /** Whether displaying this provider's results requires showing that
   * provider's attribution (e.g. a "Powered by X" badge). Always check
   * this before rendering — never assume it's false. */
  readonly requiresAttribution: boolean;
  /** True only for a provider that deliberately returns no real data
   * (see PlaceholderJudgmentProvider) — lets the service and UI branch
   * on "is this a real source" without string-comparing provider ids. */
  readonly isPlaceholder: boolean;

  search(request: JudgmentSearchRequest): Promise<JudgmentSearchResult>;
}
