import type { AiOperationType } from './operation-types';

export interface EntitlementResult {
  allowed: boolean;
  reason?: string;
}

/**
 * The single, unavoidable authorization checkpoint every AI operation
 * passes through — called from the AI Context Gateway (lib/ai/context/
 * gateway.ts) before any context is assembled, on every code path, with no
 * exception. Always allows today: trials, credits, and subscriptions
 * don't exist yet, so there is nothing real to deny against (Milestone 2,
 * Decision 1). That does not make this a no-op worth skipping — the
 * choke point itself is what matters. When real commercial enforcement
 * lands, it changes what happens inside this one function; it does not
 * require re-auditing every AI-facing call site to find where to insert a
 * check, because there is exactly one place this is ever called from.
 *
 * Deliberately provider-independent (no knowledge of OpenAI/Anthropic/
 * Gemini/etc.) and commercial-model-independent (no knowledge of trials,
 * credits, or subscriptions) — it will eventually consult whatever
 * commercial state exists (a Tenant trial window, a subscription/
 * entitlement table, a wallet balance) without this signature changing.
 */
export async function enforceEntitlement(
  _tenantId: string,
  _userId: string,
  _operationType: AiOperationType
): Promise<EntitlementResult> {
  return { allowed: true };
}
