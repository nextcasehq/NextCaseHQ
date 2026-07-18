import { getRedisClient } from '@/lib/security/redis-client';

/**
 * Minimal cache provider abstraction so the Matter Context cache isn't
 * hard-wired to Redis at every call site — a future backend swap only
 * touches this file. Every method degrades to a safe default (a miss on
 * read, a silent no-op on write/invalidate) rather than throwing when the
 * underlying store is unavailable or errors, mirroring the same fail-open
 * posture already established by lib/security/redis-rate-limit.ts — a
 * cache outage must never break the Matter or AI workflow, only make it
 * slower (every call falls back to rebuilding).
 */
export interface ContextCacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

class RedisContextCacheProvider implements ContextCacheProvider {
  async get(key: string): Promise<string | null> {
    const client = getRedisClient();
    if (!client) return null;
    try {
      return await client.get(key);
    } catch (error) {
      console.error('[CONTEXT_CACHE] get failed, treating as a miss:', (error as Error).message);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const client = getRedisClient();
    if (!client) return;
    try {
      await client.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
      console.error('[CONTEXT_CACHE] set failed, continuing without caching this result:', (error as Error).message);
    }
  }

  async del(key: string): Promise<void> {
    const client = getRedisClient();
    if (!client) return;
    try {
      await client.del(key);
    } catch (error) {
      // A failed invalidation may leave a stale entry until its TTL
      // expires — logged, not fatal, and never allowed to fail the
      // mutation that triggered it (see invalidateMatterContext in
      // cache.ts, which never throws).
      console.error('[CONTEXT_CACHE] invalidation failed:', (error as Error).message);
    }
  }
}

export const contextCacheProvider: ContextCacheProvider = new RedisContextCacheProvider();
