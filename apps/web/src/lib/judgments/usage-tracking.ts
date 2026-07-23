import type { JudgmentSearchStatus } from './types';

export interface JudgmentResearchUsageEvent {
  id: string;
  tenantId: string;
  userId: string;
  providerId: string;
  query: string;
  resultStatus: JudgmentSearchStatus;
  createdAt: string;
}

/**
 * Usage tracking is intentionally observational only in this milestone —
 * it records that a request happened, not a billing debit. No commercial
 * logic (credits, invoicing, quotas) is implemented here; see
 * lib/ai-credits for where that pattern lives once this feature has one.
 */
export interface UsageTracker {
  record(event: JudgmentResearchUsageEvent): Promise<void>;
}

/**
 * In-memory tracker — a real implementation would write to a durable
 * table, the same way lib/ai-credits/wallet-store.ts's local/mock
 * persistence is written so a future milestone can swap the storage
 * layer for a real one with a mechanical, not architectural, change.
 *
 * record() never throws — a usage-tracking failure must never fail the
 * underlying search it's recording.
 */
export class InMemoryUsageTracker implements UsageTracker {
  private events: JudgmentResearchUsageEvent[] = [];

  async record(event: JudgmentResearchUsageEvent): Promise<void> {
    this.events.push(event);
  }

  getAll(): readonly JudgmentResearchUsageEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}

let tracker: UsageTracker = new InMemoryUsageTracker();

export function getUsageTracker(): UsageTracker {
  return tracker;
}

/** Test-only: swap the tracker (or reset it) without leaking state between test files. */
export function __setUsageTrackerForTests(next: UsageTracker): void {
  tracker = next;
}
