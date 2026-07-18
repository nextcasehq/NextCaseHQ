import { getRedisClient } from './redis-client';
import { checkRateLimit as checkRateLimitInMemory, type RateLimitResult } from './rate-limit';

/**
 * Distributed (Redis-backed) counterpart to rate-limit.ts's in-memory
 * fixed-window limiter, for the two Node-runtime login routes
 * (/api/auth/session, /api/admin/session) where a shared TCP client is
 * possible. Deliberately NOT used by /api/webhooks (Edge runtime — see
 * redis-client.ts) or by anything that route imports.
 *
 * Same fixed-window semantics as the in-memory version (a window resets to
 * a fresh count the instant it expires, rather than sliding continuously)
 * so behavior is unchanged for callers, just now shared across every
 * process/instance that points at the same REDIS_URL. Falls back to the
 * in-memory limiter whenever REDIS_URL is unset, so nothing regresses in
 * an environment that hasn't configured Redis.
 */
export async function checkDistributedRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    return checkRateLimitInMemory(key, maxRequests, windowMs);
  }

  const redisKey = `ratelimit:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // First request in this window: start the window's TTL now. A tiny
      // race exists between INCR and this PEXPIRE (a process crash in
      // between would leave the key without a TTL) — the same accepted
      // tradeoff as the in-memory version's plain counter, not a new one.
      await redis.pexpire(redisKey, windowMs);
    }

    if (count > maxRequests) {
      const ttl = await redis.pttl(redisKey);
      return { allowed: false, retryAfterSeconds: Math.ceil((ttl > 0 ? ttl : windowMs) / 1000) };
    }

    return { allowed: true };
  } catch (err) {
    // Redis unreachable mid-request: fail open to the in-memory limiter
    // rather than taking every login/admin-login route down with it.
    console.error('[REDIS] rate limit check failed, falling back to in-memory:', (err as Error).message);
    return checkRateLimitInMemory(key, maxRequests, windowMs);
  }
}
