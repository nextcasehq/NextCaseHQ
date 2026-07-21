import { buildMatterContext } from './builder';
import { contextCacheProvider } from './cache-provider';
import type { ContextItem, ContextSourceType } from './types';

/**
 * Backstop only — deterministic invalidation (see invalidateMatterContext
 * below, wired into every mutation route that can change a Matter's
 * context) is the real correctness mechanism. This TTL exists purely in
 * case an invalidation call is ever missed, not as the primary guarantee.
 */
const CACHE_TTL_SECONDS = 300;

function buildCacheKey(tenantId: string, matterId: string): string {
  return `nchq:ctx:${tenantId}:${matterId}`;
}

/**
 * ContextItem carries a render() closure, which can't round-trip through
 * JSON — the cache stores this plain, serializable shape instead and
 * reconstructs a ContextItem (with render() simply returning the stored
 * text) on a cache hit. Ranking never calls anything on a ContextItem
 * beyond sourceType/weight/recency/render(), so a hydrated item behaves
 * identically to a freshly-built one.
 */
interface SerializedContextItem {
  sourceType: ContextSourceType;
  weight: number;
  recency?: string;
  text: string;
}

function serialize(items: ContextItem[]): string {
  const serialized: SerializedContextItem[] = items.map((item) => ({
    sourceType: item.sourceType,
    weight: item.weight,
    recency: item.recency,
    text: item.render(),
  }));
  return JSON.stringify(serialized);
}

function deserialize(raw: string): ContextItem[] {
  const parsed: SerializedContextItem[] = JSON.parse(raw);
  return parsed.map((entry) => ({
    sourceType: entry.sourceType,
    weight: entry.weight,
    recency: entry.recency,
    render: () => entry.text,
  }));
}

/**
 * Cache-wrapped counterpart to buildMatterContext() — tenant+matter scoped,
 * keyed as nchq:ctx:{tenantId}:{matterId} so two tenants can never collide
 * on a cache entry (matterId is itself a globally unique UUID, but the
 * tenant-qualified key is kept as explicit defense in depth rather than
 * relying on that alone). A cache miss, a Redis outage, or a corrupted
 * cache entry all fall back to the same path: rebuild from Postgres via
 * buildMatterContext() and return that — this function never throws
 * because of the cache layer itself; a real failure can only come from
 * buildMatterContext()'s own database calls.
 */
export async function getCachedMatterContext(tenantId: string, matterId: string): Promise<ContextItem[]> {
  const key = buildCacheKey(tenantId, matterId);

  const cached = await contextCacheProvider.get(key);
  if (cached !== null) {
    try {
      return deserialize(cached);
    } catch (error) {
      console.error('[CONTEXT_CACHE] cached entry was corrupted, rebuilding:', (error as Error).message);
    }
  }

  const items = await buildMatterContext(tenantId, matterId);
  await contextCacheProvider.set(key, serialize(items), CACHE_TTL_SECONDS);
  return items;
}

/**
 * The single shared invalidation hook — every route that can change what
 * a Matter's context looks like calls this after a successful mutation
 * (Matter itself, its Proceedings, Participants, and Chronology today;
 * Documents, Evidence, Drafts, AI Notes, Hearings, and Tasks in their own
 * future milestones call the exact same function with no core change
 * needed here). Never throws — a failed invalidation is logged and
 * degrades to the TTL backstop, never to a failed mutation response.
 */
export async function invalidateMatterContext(tenantId: string, matterId: string): Promise<void> {
  const key = buildCacheKey(tenantId, matterId);
  try {
    await contextCacheProvider.del(key);
  } catch (error) {
    console.error('[CONTEXT_CACHE] invalidateMatterContext failed unexpectedly:', (error as Error).message);
  }
}
