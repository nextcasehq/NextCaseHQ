import { getRedisClient, __resetRedisClientForTests } from '../redis-client';

const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

afterEach(() => {
  // process.env.REDIS_URL = undefined would coerce to the *string*
  // "undefined" (truthy!) rather than actually unsetting it — a real
  // Node.js gotcha, not a hypothetical one (it broke this suite once).
  if (ORIGINAL_REDIS_URL === undefined) {
    delete process.env.REDIS_URL;
  } else {
    process.env.REDIS_URL = ORIGINAL_REDIS_URL;
  }
  __resetRedisClientForTests();
});

describe('redis-client', () => {
  test('returns null when REDIS_URL is unset', () => {
    delete process.env.REDIS_URL;
    __resetRedisClientForTests();
    expect(getRedisClient()).toBeNull();
  });

  test('returns a working client when REDIS_URL is set', async () => {
    if (!process.env.REDIS_URL) {
      // No Redis service available in this environment (e.g. local run
      // without `redis-server` started) — CI always sets REDIS_URL via
      // the redis service container, so this path is exercised there.
      return;
    }
    __resetRedisClientForTests();
    const client = getRedisClient();
    expect(client).not.toBeNull();
    await client!.set('redis-client-test-key', 'ok');
    expect(await client!.get('redis-client-test-key')).toBe('ok');
    await client!.del('redis-client-test-key');
  });
});
