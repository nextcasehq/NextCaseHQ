/**
 * Shared between /api/cases/[id]/court-notes and any future consumer (the
 * mobile Court Note screen, Matter Health, search) — kept out of either
 * route.ts file so it's a normal importable module.
 */
export const COURT_FORUM_TYPES = [
  'SUPREME_COURT',
  'HIGH_COURT',
  'CIVIL_COURT',
  'CRIMINAL_COURT',
  'FAMILY_COURT',
  'COMMERCIAL_COURT',
  'CONSUMER_COMMISSION',
  'LABOUR_COURT',
  'MACT',
  'ARBITRATION',
  'REVENUE_COURT',
  'OTHER',
] as const;
export type CourtForumType = (typeof COURT_FORUM_TYPES)[number];

export const COURT_FORUM_LABELS: Record<CourtForumType, string> = {
  SUPREME_COURT: 'Supreme Court',
  HIGH_COURT: 'High Court',
  CIVIL_COURT: 'Civil Court',
  CRIMINAL_COURT: 'Criminal Court',
  FAMILY_COURT: 'Family Court',
  COMMERCIAL_COURT: 'Commercial Court',
  CONSUMER_COMMISSION: 'Consumer Commission',
  LABOUR_COURT: 'Labour Court',
  MACT: 'Motor Accident Claims Tribunal',
  ARBITRATION: 'Arbitration',
  REVENUE_COURT: 'Revenue Court',
  OTHER: 'Other Court / Forum',
};

export const COURT_NOTE_INPUT_METHODS = ['MANUAL', 'VOICE', 'HYBRID'] as const;
export type CourtNoteInputMethod = (typeof COURT_NOTE_INPUT_METHODS)[number];

/**
 * Production Matter Register Foundation — how this hearing/stage update was
 * recorded. ECOURTS_CONFIRMED reflects the existing eCourts "Record an
 * update" flow (manual advocate-assisted verification only — no
 * scraping, no automated synchronisation); it is never set without an
 * explicit advocate confirmation.
 */
export const COURT_NOTE_SOURCES = [
  'ADVOCATE_ENTRY',
  'ECOURTS_CONFIRMED',
  'COURT_ORDER',
  'ADMINISTRATIVE_UPDATE',
] as const;
export type CourtNoteSource = (typeof COURT_NOTE_SOURCES)[number];

export const COURT_NOTE_VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'ADVOCATE_CONFIRMED',
  'ECOURTS_CONFIRMED',
] as const;
export type CourtNoteVerificationStatus = (typeof COURT_NOTE_VERIFICATION_STATUSES)[number];

/**
 * The one string every future reader (list views, search, templates) should
 * show — never lossy for 'OTHER', never needs a caller-side CASE expression.
 */
export function resolveCourtForumDisplay(type: CourtForumType, other: string | null | undefined): string {
  if (type === 'OTHER') {
    return (other ?? '').trim() || COURT_FORUM_LABELS.OTHER;
  }
  return COURT_FORUM_LABELS[type];
}
