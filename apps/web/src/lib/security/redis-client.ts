import Redis from 'ioredis';

/**
 * Lazy singleton, Node-runtime only. Deliberately NOT imported from
 * anything the Edge runtime (apps/web/src/app/api/webhooks/route.ts,
 * export const runtime = 'edge') pulls in — ioredis is a raw-TCP client
 * built on Node's `net`/`tls` modules, neither of which exist in the Edge
 * runtime. See redis-rate-limit.ts for why the webhook route's rate limit
 * and replay guard are intentionally excluded from this milestone.
 *
 * Returns null when REDIS_URL is unset, so every caller can fall back to
 * the existing in-memory implementation with zero behavior change in any
 * environment that hasn't configured Redis yet (local dev, and any
 * production deployment before it's provisioned).
 */
let client: Redis | null | undefined;

export function getRedisClient(): Redis | null {
  if (client !== undefined) {
    return client;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return null;
  }

  client = new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: false,
  });
  client.on('error', (err) => {
    console.error('[REDIS] connection error:', err.message);
  });
  return client;
}

/** Test-only: force re-evaluation of REDIS_URL / a fresh client instance. */
export function __resetRedisClientForTests(): void {
  if (client) {
    client.disconnect();
  }
  client = undefined;
}
