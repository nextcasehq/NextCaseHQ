import { DatabaseClient } from '@/lib/db/db-client';
import { getCachedMatterContext } from './cache';
import { rankContextItems } from './ranking';
import type { ContextBudget, ContextItem } from './types';
import { enforceEntitlement } from '../entitlement';
import type { AiOperationType } from '../operation-types';

/**
 * apps/web compiles to ES5 (see tsconfig.json) — Object.setPrototypeOf is
 * required for `instanceof` to work on a subclassed Error, matching the
 * pattern already established by lib/auth/session.ts's
 * UnauthenticatedError and lib/ai/errors.ts's AIProviderNotConfiguredError.
 */
export class MatterNotFoundError extends Error {
  constructor(message = 'Matter not found.') {
    super(message);
    Object.setPrototypeOf(this, MatterNotFoundError.prototype);
  }
}

export class EntitlementDeniedError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    Object.setPrototypeOf(this, EntitlementDeniedError.prototype);
  }
}

export interface GatewayResult {
  items: ContextItem[];
  truncated: boolean;
  sourceCounts: Record<string, number>;
}

export interface GatewayOptions {
  operationType: AiOperationType;
  budget?: ContextBudget;
}

/**
 * The AI Context Gateway — the single, unavoidable entry point every AI
 * feature uses to obtain a Matter's context. No AI-facing code (the
 * Prompt Builder, /api/ai/ask, or any future AI endpoint/background
 * worker/internal service) may read Matter/LegalCase/MatterParticipant/
 * MatterEvent directly; it calls this function instead.
 *
 * Runs, in this fixed order, matching the pipeline sequence every AI
 * request must follow: Authorization (re-verify the Matter belongs to
 * this tenant — RLS-scoped, so a cross-tenant or forged matterId is
 * indistinguishable from a nonexistent one and fails closed before
 * anything else happens) → enforceEntitlement() (the commercial
 * checkpoint — always allows today, see entitlement.ts) → the cached
 * Context Builder (PR 2A/2B) → Context Ranking (PR 2A). Usage Metering
 * and Audit Logging happen one layer up, in the caller (lib/ai/rag.ts),
 * since only the caller knows whether the resulting context actually led
 * to a provider call worth metering.
 */
export async function getMatterContext(
  tenantId: string,
  userId: string,
  matterId: string,
  options: GatewayOptions
): Promise<GatewayResult> {
  const db = new DatabaseClient();
  const matterRows = await db.execute<{ id: string }>(
    tenantId,
    `SELECT id FROM "Matter" WHERE id = $1`,
    [matterId]
  );
  if (matterRows.length === 0) {
    throw new MatterNotFoundError();
  }

  const entitlement = await enforceEntitlement(tenantId, userId, options.operationType);
  if (!entitlement.allowed) {
    throw new EntitlementDeniedError(entitlement.reason ?? 'AI access is not currently entitled for this tenant.');
  }

  const items = await getCachedMatterContext(tenantId, matterId);
  const ranked = rankContextItems(items, options.budget);

  const sourceCounts: Record<string, number> = {};
  for (const item of items) {
    sourceCounts[item.sourceType] = (sourceCounts[item.sourceType] ?? 0) + 1;
  }

  return { items: ranked.items, truncated: ranked.truncated, sourceCounts };
}

/** Renders a ranked item list into the single text block the Prompt Builder's matterContext layer expects. */
export function renderContext(items: ContextItem[]): string {
  return items.map((item) => item.render()).join('\n');
}
