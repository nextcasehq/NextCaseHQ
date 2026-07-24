/**
 * Extracted from the Matter Register (apps/web/src/app/matters/page.tsx) so
 * the exact urgency classification the Register renders can also be called
 * from server code (the /system/runtime diagnostics page) without
 * duplicating the logic. No behavior change — same function, new home.
 */
export type RowUrgency = 'OVERDUE' | 'TODAY' | 'SOON' | null;

/** Pure display computation off next_hearing_date — no new data, matches
 * the Phase 2 Register-as-decision-dashboard mandate. Deliberately silent
 * (returns null) once a matter is more than a week out: the point is to
 * flag what needs attention, not to reassure about everything that doesn't. */
export function rowUrgency(nextHearingDate: string | null): { level: RowUrgency; label: string } {
  if (!nextHearingDate) return { level: null, label: '' };
  const target = new Date(`${nextHearingDate}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return { level: null, label: '' };
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const diffDays = Math.round((target.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { level: 'OVERDUE', label: `OVERDUE ${Math.abs(diffDays)}D` };
  if (diffDays === 0) return { level: 'TODAY', label: 'HEARING TODAY' };
  if (diffDays <= 7) return { level: 'SOON', label: `DUE IN ${diffDays}D` };
  return { level: null, label: '' };
}
