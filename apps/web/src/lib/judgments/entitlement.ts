export interface JudgmentResearchEntitlementResult {
  allowed: boolean;
  reason?: string;
}

/**
 * The single, unavoidable authorization checkpoint every Judgment
 * Research call passes through — mirrors lib/ai/entitlement.ts exactly in
 * spirit. Always allows today: no commercial model (trial, credit cost,
 * plan restriction) exists yet for Judgment Research, so there is
 * nothing real to deny against.
 *
 * That does not make this a no-op worth skipping — the choke point
 * itself is what matters. When a real commercial model lands for this
 * feature (e.g. billed against AI Credits, or restricted to certain
 * plans once a real provider is connected), it changes what happens
 * inside this one function; it does not require re-auditing every
 * Judgment Research call site to find where to insert a check, because
 * there is exactly one place this is ever called from
 * (judgment-research-service.ts).
 *
 * Deliberately provider-independent — it has no knowledge of the
 * placeholder provider or any future real provider.
 */
export async function enforceJudgmentResearchEntitlement(
  _tenantId: string,
  _userId: string
): Promise<JudgmentResearchEntitlementResult> {
  return { allowed: true };
}
