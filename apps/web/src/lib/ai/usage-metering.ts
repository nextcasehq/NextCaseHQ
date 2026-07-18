import { DatabaseClient } from '@/lib/db/db-client';
import type { AiOperationType } from './operation-types';

export type AiUsageEventStatus = 'SUCCESS' | 'FAILED';

export interface RecordAiUsageEventInput {
  tenantId: string;
  userId: string | null;
  matterId?: string | null;
  proceedingId?: string | null;
  operationType: AiOperationType;
  provider?: string | null;
  model?: string | null;
  estimatedContextSize?: number | null;
  estimatedProviderTokens?: number | null;
  status: AiUsageEventStatus;
}

/**
 * Rough, provider-agnostic token estimate for internal instrumentation
 * only (Milestone 2, Decision 7) — never exposed to end users. Chars/4 is
 * a widely-used approximation; deliberately not a real per-vendor
 * tokenizer dependency, since this number is never billed against.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Insert-only usage ledger write (see db/schema.sql — the nextcase_app
 * role's UPDATE/DELETE grants on AiUsageEvent are explicitly revoked, so
 * this is append-only by construction, not just by convention). Never
 * throws: a metering failure must never take down the AI response it's
 * trying to record, matching the same fail-open posture as the context
 * cache (lib/ai/context/cache-provider.ts).
 */
export async function recordAiUsageEvent(input: RecordAiUsageEventInput): Promise<void> {
  try {
    const db = new DatabaseClient();
    await db.execute(
      input.tenantId,
      `INSERT INTO "AiUsageEvent"
         (tenant_id, user_id, matter_id, proceeding_id, operation_type, provider, model,
          estimated_context_size, estimated_provider_tokens, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.tenantId,
        input.userId,
        input.matterId ?? null,
        input.proceedingId ?? null,
        input.operationType,
        input.provider ?? null,
        input.model ?? null,
        input.estimatedContextSize ?? null,
        input.estimatedProviderTokens ?? null,
        input.status,
      ]
    );
  } catch (error) {
    console.error('[AI_USAGE_METERING] failed to record usage event:', (error as Error).message);
  }
}
