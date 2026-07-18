import type { ContextItem, ContextBudget, RankedContext } from './types';

/**
 * Deterministic ranking only — no LLM call. Sorts by each item's own
 * weight (highest first), breaking ties by recency (newest first, items
 * with no recency sort last within a tie), then fills the caller's budget
 * greedily from highest priority down. An item is included whole or
 * dropped entirely — never split mid-render. Stops at the first item that
 * would exceed maxChars/maxItems rather than skipping ahead to a
 * smaller-but-lower-priority item, since every remaining item has equal or
 * lower priority anyway.
 */
export function rankContextItems(items: ContextItem[], budget: ContextBudget = {}): RankedContext {
  const sorted = [...items].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (a.recency && b.recency) return b.recency.localeCompare(a.recency);
    if (a.recency) return -1;
    if (b.recency) return 1;
    return 0;
  });

  const result: ContextItem[] = [];
  let totalChars = 0;
  let truncated = false;

  for (const item of sorted) {
    if (budget.maxItems !== undefined && result.length >= budget.maxItems) {
      truncated = true;
      break;
    }
    const rendered = item.render();
    if (budget.maxChars !== undefined && totalChars + rendered.length > budget.maxChars) {
      truncated = true;
      break;
    }
    result.push(item);
    totalChars += rendered.length;
  }

  return { items: result, truncated };
}
