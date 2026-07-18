/**
 * In-memory replay guard, scoped to the webhook signature tolerance
 * window. This is sufficient because anything outside that window is
 * already rejected as expired by webhook-signature.ts — the only window
 * in which a replay is even possible is the one this cache covers.
 *
 * Known limitation, stated plainly rather than silently overstated: this
 * is per-process state. A horizontally-scaled multi-instance Edge
 * deployment needs a shared store (Redis, or a DB table) for correct
 * replay protection across instances — appropriate follow-up
 * infrastructure work, out of scope for this foundation milestone.
 */

const seen = new Map<string, number>(); // signature -> expiry (ms since epoch)

function sweepExpired(): void {
  const now = Date.now();
  // apps/web compiles to ES5, where `for...of` over a Map needs
  // --downlevelIteration; Map.prototype.forEach works without it.
  const expiredKeys: string[] = [];
  seen.forEach((expiry, key) => {
    if (expiry <= now) expiredKeys.push(key);
  });
  expiredKeys.forEach((key) => seen.delete(key));
}

export function hasBeenSeen(signature: string): boolean {
  sweepExpired();
  return seen.has(signature);
}

export function remember(signature: string, ttlMs: number): void {
  seen.set(signature, Date.now() + ttlMs);
}

/** Test-only: reset state between test runs so tests don't interfere. */
export function __resetForTests(): void {
  seen.clear();
}
