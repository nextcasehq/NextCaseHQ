import { checkDistributedRateLimit } from '../redis-rate-limit';
import { __resetRedisClientForTests, getRedisClient } from '../redis-client';
import { __resetRateLimitForTests } from '../rate-limit';

const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

afterEach(async () => {
  const client = getRedisClient();
  if (client) {
    await client.flushdb();
  }
  // process.env.REDIS_URL = undefined would coerce to the *string*
  // "undefined" (truthy!) rather than actually unsetting it.
  if (ORIGINAL_REDIS_URL === undefined) {
    delete process.env.REDIS_URL;
  } else {
    process.env.REDIS_URL = ORIGINAL_REDIS_URL;
  }
  __resetRedisClientForTests();
  __resetRateLimitForTests();
});

describe('checkDistributedRateLimit — no REDIS_URL configured (fallback)', () => {
  test('falls back to the in-memory limiter, unaffected in behavior', async () => {
    delete process.env.REDIS_URL;
    __resetRedisClientForTests();

    const key = `fallback-test-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const result = await checkDistributedRateLimit(key, 5, 60_000);
      expect(result.allowed).toBe(true);
    }
    const sixth = await checkDistributedRateLimit(key, 5, 60_000);
    expect(sixth.allowed).toBe(false);
  });
});

describe('checkDistributedRateLimit — REDIS_URL configured (real Redis)', () => {
  const hasRedis = () => Boolean(process.env.REDIS_URL);

  test('allows up to the max, then rejects with a retry-after', async () => {
    if (!hasRedis()) return; // CI provides a real redis service container
    __resetRedisClientForTests();

    const key = `redis-test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      const result = await checkDistributedRateLimit(key, 3, 60_000);
      expect(result.allowed).toBe(true);
    }
    const fourth = await checkDistributedRateLimit(key, 3, 60_000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('the limit is shared across separate client instances — the entire point of this milestone', async () => {
    if (!hasRedis()) return;

    const key = `redis-shared-test-${Date.now()}`;

    // Simulate "instance A": exhaust the limit.
    __resetRedisClientForTests();
    for (let i = 0; i < 2; i++) {
      const result = await checkDistributedRateLimit(key, 2, 60_000);
      expect(result.allowed).toBe(true);
    }

    // Simulate "instance B": a fresh client connection to the same Redis,
    // as would happen on a second app instance. It must see the same
    // counter, not start over at zero the way the in-memory limiter would.
    __resetRedisClientForTests();
    const resultOnOtherInstance = await checkDistributedRateLimit(key, 2, 60_000);
    expect(resultOnOtherInstance.allowed).toBe(false);
  });

  test('a fresh window (different key) is unaffected by another key being rate-limited', async () => {
    if (!hasRedis()) return;
    __resetRedisClientForTests();

    const exhaustedKey = `redis-exhausted-${Date.now()}`;
    await checkDistributedRateLimit(exhaustedKey, 1, 60_000);
    const blocked = await checkDistributedRateLimit(exhaustedKey, 1, 60_000);
    expect(blocked.allowed).toBe(false);

    const freshKey = `redis-fresh-${Date.now()}`;
    const fresh = await checkDistributedRateLimit(freshKey, 1, 60_000);
    expect(fresh.allowed).toBe(true);
  });
});
