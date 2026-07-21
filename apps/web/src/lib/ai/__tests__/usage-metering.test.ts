import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { recordAiUsageEvent, estimateTokenCount } from '../usage-metering';

/**
 * AiUsageEvent is an append-only ledger (nextcase_app has no UPDATE/DELETE
 * grant on it — see db/schema.sql). These tests never attempt to clean up
 * rows they insert; instead they use fixed, dedicated tenant/user ids and
 * assert via before/after count deltas or ID-membership checks, the same
 * pattern established in rag.test.ts for the same reason.
 */
describe('estimateTokenCount', () => {
  test('estimates roughly chars/4, rounded up', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('a')).toBe(1);
    expect(estimateTokenCount('abcd')).toBe(1);
    expect(estimateTokenCount('abcde')).toBe(2);
    expect(estimateTokenCount('a'.repeat(400))).toBe(100);
  });
});

describe('recordAiUsageEvent', () => {
  const db = new DatabaseClient();
  const TENANT_ID = '00000000-0000-4000-8000-000000000bf1';
  const TENANT_B = '00000000-0000-4000-8000-000000000bf2';
  const USER_ID = '00000000-0000-4000-8000-000000000bf3';

  beforeAll(async () => {
    await db.execute(TENANT_ID, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_ID,
      'Usage Metering Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Usage Metering Test Tenant B',
    ]);
    await db.execute(
      TENANT_ID,
      `INSERT INTO "User" (id, tenant_id, email, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_ID, 'usage-metering-test@nextcase.local', 'Usage Metering Test User']
    );
  });

  afterAll(async () => {
    await closePool();
  });

  async function usageEventCount(tenantId: string): Promise<number> {
    const rows = await db.execute<{ count: number }>(
      tenantId,
      `SELECT COUNT(*)::int AS count FROM "AiUsageEvent" WHERE tenant_id = $1`,
      [tenantId]
    );
    return rows[0].count;
  }

  test('inserts a row with the given fields on success', async () => {
    const before = await usageEventCount(TENANT_ID);
    await recordAiUsageEvent({
      tenantId: TENANT_ID,
      userId: USER_ID,
      operationType: 'AI_CHAT',
      provider: 'openai',
      model: 'gpt-4o-mini',
      estimatedContextSize: 42,
      estimatedProviderTokens: 11,
      status: 'SUCCESS',
    });
    expect(await usageEventCount(TENANT_ID)).toBe(before + 1);

    const rows = await db.execute<{
      operation_type: string;
      provider: string;
      model: string;
      status: string;
      estimated_context_size: number;
      estimated_provider_tokens: number;
      estimated_cost_usd: string | null;
    }>(
      TENANT_ID,
      `SELECT operation_type, provider, model, status, estimated_context_size, estimated_provider_tokens, estimated_cost_usd
       FROM "AiUsageEvent" WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [TENANT_ID]
    );
    expect(rows[0]).toMatchObject({
      operation_type: 'AI_CHAT',
      provider: 'openai',
      model: 'gpt-4o-mini',
      status: 'SUCCESS',
      estimated_context_size: 42,
      estimated_provider_tokens: 11,
    });
    // No real per-provider/per-model cost-rate table exists yet — deliberately NULL, never fabricated.
    expect(rows[0].estimated_cost_usd).toBeNull();
  });

  test('never throws, even when the insert itself fails', async () => {
    const before = await usageEventCount(TENANT_ID);
    await expect(
      recordAiUsageEvent({
        tenantId: TENANT_ID,
        userId: USER_ID,
        // An operation_type outside the frozen enum violates the
        // aiusageevent_operation_type_check CHECK constraint — a real DB
        // failure this function must swallow rather than propagate,
        // matching the fail-open posture of the context cache.
        operationType: 'NOT_A_REAL_OPERATION' as never,
        status: 'SUCCESS',
      })
    ).resolves.toBeUndefined();
    expect(await usageEventCount(TENANT_ID)).toBe(before);
  });

  test('defaults matterId, proceedingId, provider, model, and estimate fields to null when omitted', async () => {
    await recordAiUsageEvent({ tenantId: TENANT_ID, userId: USER_ID, operationType: 'MATTER_CONTEXT', status: 'SUCCESS' });
    const rows = await db.execute<{
      matter_id: string | null;
      proceeding_id: string | null;
      provider: string | null;
      model: string | null;
      estimated_context_size: number | null;
      estimated_provider_tokens: number | null;
    }>(
      TENANT_ID,
      `SELECT matter_id, proceeding_id, provider, model, estimated_context_size, estimated_provider_tokens
       FROM "AiUsageEvent" WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [TENANT_ID]
    );
    expect(rows[0]).toEqual({
      matter_id: null,
      proceeding_id: null,
      provider: null,
      model: null,
      estimated_context_size: null,
      estimated_provider_tokens: null,
    });
  });

  test('cross-tenant isolation: a row inserted for one tenant is never visible to another', async () => {
    const rowsA = await db.execute<{ id: string }>(
      TENANT_ID,
      `INSERT INTO "AiUsageEvent" (tenant_id, user_id, operation_type, status) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_ID, USER_ID, 'AI_CHAT', 'SUCCESS']
    );
    const rowsB = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "AiUsageEvent" (tenant_id, user_id, operation_type, status) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_B, null, 'AI_CHAT', 'SUCCESS']
    );
    const idA = rowsA[0].id;
    const idB = rowsB[0].id;

    const visibleToA = await db.execute<{ id: string }>(TENANT_ID, `SELECT id FROM "AiUsageEvent"`, []);
    const visibleToB = await db.execute<{ id: string }>(TENANT_B, `SELECT id FROM "AiUsageEvent"`, []);

    expect(visibleToA.some((r) => r.id === idA)).toBe(true);
    expect(visibleToA.some((r) => r.id === idB)).toBe(false);
    expect(visibleToB.some((r) => r.id === idB)).toBe(true);
    expect(visibleToB.some((r) => r.id === idA)).toBe(false);
  });

  test('the application role cannot UPDATE AiUsageEvent rows', async () => {
    await expect(
      db.execute(TENANT_ID, `UPDATE "AiUsageEvent" SET status = 'FAILED' WHERE tenant_id = $1`, [TENANT_ID])
    ).rejects.toThrow(/permission denied for table AiUsageEvent/i);
  });

  test('the application role cannot DELETE AiUsageEvent rows', async () => {
    await expect(
      db.execute(TENANT_ID, `DELETE FROM "AiUsageEvent" WHERE tenant_id = $1`, [TENANT_ID])
    ).rejects.toThrow(/permission denied for table AiUsageEvent/i);
  });
});
