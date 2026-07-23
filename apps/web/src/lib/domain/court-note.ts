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
 * Case Diary Phase 1 closure: what happened at a hearing, as structured
 * data an advocate can rely on and the Proceeding's status can be derived
 * from — never something only inferable by reading the free-text note.
 */
export const HEARING_OUTCOMES = [
  'CONDUCTED',
  'ADJOURNED',
  'DISPOSED',
  'DISMISSED',
  'WITHDRAWN',
  'SETTLED',
  'RESERVED_FOR_ORDERS',
  'JUDGMENT_PRONOUNCED',
] as const;
export type HearingOutcome = (typeof HEARING_OUTCOMES)[number];

export const HEARING_OUTCOME_LABELS: Record<HearingOutcome, string> = {
  CONDUCTED: 'Hearing Conducted',
  ADJOURNED: 'Adjourned',
  DISPOSED: 'Disposed',
  DISMISSED: 'Dismissed',
  WITHDRAWN: 'Withdrawn',
  SETTLED: 'Settled',
  RESERVED_FOR_ORDERS: 'Reserved for Orders',
  JUDGMENT_PRONOUNCED: 'Judgment Pronounced',
};

// Outcomes that conclude this Proceeding at this forum (an appeal, if any,
// is always a separate, new Proceeding — see relationship_to_prior). Used
// to decide whether the Proceeding's own status should move to DISPOSED;
// it does NOT close the parent Matter, which may have other open
// Proceedings and is only ever closed by an explicit, guarded Matter
// Closure action.
export const TERMINAL_HEARING_OUTCOMES: readonly HearingOutcome[] = [
  'DISPOSED',
  'DISMISSED',
  'WITHDRAWN',
  'SETTLED',
  'JUDGMENT_PRONOUNCED',
];

export function isTerminalHearingOutcome(outcome: HearingOutcome): boolean {
  return TERMINAL_HEARING_OUTCOMES.includes(outcome);
}

/**
 * Maps a hearing outcome onto LegalCase.status's existing four-value enum
 * (PENDING/HEARING/DISPOSED/APPEAL) rather than widening that enum — the
 * precise reason a Proceeding concluded (dismissed vs. withdrawn vs.
 * settled vs. judgment) stays fully recorded on the immutable CourtNote row
 * itself; the coarser Proceeding-wide status just needs to correctly land
 * on DISPOSED for any of them.
 */
export function legalCaseStatusForOutcome(outcome: HearingOutcome): 'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL' {
  return isTerminalHearingOutcome(outcome) ? 'DISPOSED' : 'HEARING';
}

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
