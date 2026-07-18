/**
 * In-memory, per-process, fixed-window rate limiter. Same category of
 * foundation-level control as the webhook replay guard (see
 * replay-guard.ts): correct for a single instance; a horizontally-scaled
 * multi-instance deployment needs a shared store (Redis) for limits to
 * hold across instances — explicitly out of scope for this milestone.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

function sweepExpired(now: number): void {
  const expiredKeys: string[] = [];
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) expiredKeys.push(key);
  });
  expiredKeys.forEach((key) => buckets.delete(key));
}

/**
 * Best-effort client identifier from proxy-set headers. In production this
 * depends on the reverse proxy/CDN correctly setting x-forwarded-for and
 * stripping any client-supplied value first — a real deployment concern,
 * not something this in-process limiter can itself guarantee.
 */
export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

/** Test-only: reset state between test runs so tests don't interfere. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
