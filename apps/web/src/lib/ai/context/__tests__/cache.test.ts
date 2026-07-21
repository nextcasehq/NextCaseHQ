import { getCachedMatterContext, invalidateMatterContext } from '../cache';
import { rankContextItems } from '../ranking';
import { getRedisClient, __resetRedisClientForTests } from '@/lib/security/redis-client';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000701';
const TENANT_B = '00000000-0000-4000-8000-000000000702';
const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

function cacheKey(tenantId: string, matterId: string): string {
  return `nchq:ctx:${tenantId}:${matterId}`;
}

function hasRedis(): boolean {
  return Boolean(process.env.REDIS_URL);
}

describe('Matter Context Cache', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Context Cache Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Context Cache Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    if (hasRedis()) {
      const client = getRedisClient();
      await client?.flushdb();
    }
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    if (ORIGINAL_REDIS_URL === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = ORIGINAL_REDIS_URL;
    }
    __resetRedisClientForTests();
    await closePool();
  });

  async function createMatter(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, title]
    );
    return rows[0].id;
  }

  test('a cache miss builds context from the database and stores it', async () => {
    if (!hasRedis()) return; // CI provides a real redis service container
    const matterId = await createMatter(TENANT_A, 'Fresh Matter');

    const items = await getCachedMatterContext(TENANT_A, matterId);
    expect(items).toHaveLength(1);
    expect(items[0].render()).toContain('Fresh Matter');

    const raw = await getRedisClient()!.get(cacheKey(TENANT_A, matterId));
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toHaveLength(1);
  });

  test('a cache hit serves the stored value without re-reading the database — proven by staleness', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter(TENANT_A, 'Original Title');

    const firstRead = await getCachedMatterContext(TENANT_A, matterId);
    expect(firstRead[0].render()).toContain('Original Title');

    // Mutate the underlying row directly, bypassing invalidateMatterContext
    // entirely — a real mutation route always calls it, but this isolates
    // the cache layer itself: if the second read still shows the old
    // title, that proves it truly served from cache, not the database.
    await db.execute(TENANT_A, `UPDATE "Matter" SET title = $1 WHERE id = $2`, ['Changed Behind The Cache', matterId]);

    const secondRead = await getCachedMatterContext(TENANT_A, matterId);
    expect(secondRead[0].render()).toContain('Original Title');
    expect(secondRead[0].render()).not.toContain('Changed Behind The Cache');
  });

  test('invalidateMatterContext clears the entry so the next read rebuilds from the database', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter(TENANT_A, 'Before Invalidation');

    await getCachedMatterContext(TENANT_A, matterId);
    await db.execute(TENANT_A, `UPDATE "Matter" SET title = $1 WHERE id = $2`, ['After Invalidation', matterId]);
    await invalidateMatterContext(TENANT_A, matterId);

    const rebuilt = await getCachedMatterContext(TENANT_A, matterId);
    expect(rebuilt[0].render()).toContain('After Invalidation');
  });

  test('cache keys are tenant-qualified — no cross-tenant leakage even in principle', async () => {
    if (!hasRedis()) return;
    const matterIdA = await createMatter(TENANT_A, 'Tenant A Matter');
    const matterIdB = await createMatter(TENANT_B, 'Tenant B Matter');

    await getCachedMatterContext(TENANT_A, matterIdA);
    await getCachedMatterContext(TENANT_B, matterIdB);

    const rawA = await getRedisClient()!.get(cacheKey(TENANT_A, matterIdA));
    const rawB = await getRedisClient()!.get(cacheKey(TENANT_B, matterIdB));
    expect(rawA).not.toBeNull();
    expect(rawB).not.toBeNull();
    expect(JSON.parse(rawA as string)[0].text).toContain('Tenant A Matter');
    expect(JSON.parse(rawB as string)[0].text).toContain('Tenant B Matter');

    // Tenant B reading tenant A's matter id gets nothing from the cache —
    // buildMatterContext's own RLS scoping still applies underneath.
    const crossTenantRead = await getCachedMatterContext(TENANT_B, matterIdA);
    expect(crossTenantRead).toHaveLength(0);
  });

  test('a Redis outage (unconfigured) falls back to a live rebuild without throwing', async () => {
    delete process.env.REDIS_URL;
    __resetRedisClientForTests();

    const matterId = await createMatter(TENANT_A, 'No Redis Configured');
    const items = await getCachedMatterContext(TENANT_A, matterId);
    expect(items).toHaveLength(1);
    expect(items[0].render()).toContain('No Redis Configured');

    // Restore for subsequent tests in this file.
    if (ORIGINAL_REDIS_URL !== undefined) {
      process.env.REDIS_URL = ORIGINAL_REDIS_URL;
      __resetRedisClientForTests();
    }
  });

  test('a Redis outage (client errors mid-request) falls back to a live rebuild without throwing', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter(TENANT_A, 'Redis Errors Mid-Request');

    const client = getRedisClient()!;
    const originalGet = client.get.bind(client);
    const originalSet = client.set.bind(client);
    client.get = (async () => {
      throw new Error('simulated redis outage');
    }) as typeof client.get;
    client.set = (async () => {
      throw new Error('simulated redis outage');
    }) as typeof client.set;

    try {
      const items = await getCachedMatterContext(TENANT_A, matterId);
      expect(items).toHaveLength(1);
      expect(items[0].render()).toContain('Redis Errors Mid-Request');
    } finally {
      client.get = originalGet;
      client.set = originalSet;
    }
  });

  test('an expired entry rebuilds correctly rather than serving stale data forever', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter(TENANT_A, 'Will Expire');

    await getCachedMatterContext(TENANT_A, matterId);
    // Force the TTL down to 1 second rather than waiting on the real
    // 5-minute default — proves the TTL backstop itself works, not just
    // that deterministic invalidation does.
    await getRedisClient()!.expire(cacheKey(TENANT_A, matterId), 1);
    await db.execute(TENANT_A, `UPDATE "Matter" SET title = $1 WHERE id = $2`, ['Rebuilt After Expiry', matterId]);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const rebuilt = await getCachedMatterContext(TENANT_A, matterId);
    expect(rebuilt[0].render()).toContain('Rebuilt After Expiry');
  });

  test('items served from cache rank identically to freshly-built items — no ranking/truncation regression', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter(TENANT_A, 'Ranking Parity Matter');
    await db.execute(TENANT_A, `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      matterId,
      '2026-01-15',
      'Filed notice',
    ]);

    const fresh = await getCachedMatterContext(TENANT_A, matterId);
    const cached = await getCachedMatterContext(TENANT_A, matterId); // now a hit

    const rankedFresh = rankContextItems(fresh);
    const rankedCached = rankContextItems(cached);

    expect(rankedCached.items.map((i) => i.render())).toEqual(rankedFresh.items.map((i) => i.render()));
    expect(rankedCached.items.map((i) => i.weight)).toEqual(rankedFresh.items.map((i) => i.weight));
    expect(rankedCached.truncated).toBe(rankedFresh.truncated);

    // And a budget behaves identically post-cache-round-trip too.
    const budgeted = rankContextItems(cached, { maxItems: 1 });
    expect(budgeted.items).toHaveLength(1);
    expect(budgeted.truncated).toBe(true);
  });
});
