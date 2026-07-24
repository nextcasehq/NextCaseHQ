import type { HearingOutcome } from '@/lib/domain/court-note';

/**
 * Extracted from the Case Diary (apps/web/src/app/cases/page.tsx) so the
 * exact daily-bucket assignment it renders can also be called from server
 * code (the /system/runtime diagnostics page) without duplicating the
 * logic. No behavior change — same function, new home. Only the fields
 * bucketFor actually reads, not the full page-local LegalCase interface.
 */
export type DailyBucket = 'adjourned' | 'today' | 'completed' | 'upcoming' | 'other';

export interface BucketableProceeding {
  updated_at: string;
  hearing_date: string | null;
  latest_hearing_outcome: HearingOutcome | null;
}

/**
 * A Proceeding falls into exactly one bucket, checked in this order (most
 * specific/actionable first):
 *  1. Adjourned today — a Court Note was saved today and its outcome was
 *     ADJOURNED. The single most "needs follow-up" state.
 *  2. Today's Hearings — next hearing date is today.
 *  3. Completed today — a Court Note was saved today with any other outcome.
 *  4. Upcoming — a future hearing date, not yet due.
 *  5. Neither — everything else; only reachable via "All Proceedings".
 */
export function bucketFor(c: BucketableProceeding, today: string): DailyBucket {
  const updatedToday = c.updated_at.slice(0, 10) === today;
  if (updatedToday && c.latest_hearing_outcome === 'ADJOURNED') return 'adjourned';
  if (c.hearing_date === today) return 'today';
  if (updatedToday) return 'completed';
  if (c.hearing_date && c.hearing_date > today) return 'upcoming';
  return 'other';
}
