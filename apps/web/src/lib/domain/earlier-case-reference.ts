/**
 * Shared between /api/matters/[id]/earlier-references and any future
 * consumer — kept out of the route.ts file so it's a normal importable
 * module.
 */
export const EARLIER_CASE_REFERENCE_TYPES = [
  'FIR_CRIME_NUMBER',
  'COMPLAINT',
  'TRIAL_MATTER',
  'APPEAL',
  'REVISION',
  'REVIEW',
  'WRIT',
  'SLP',
  'EXECUTION',
  'REMAND',
  'CONNECTED_PROCEEDING',
  'OTHER',
] as const;
export type EarlierCaseReferenceType = (typeof EARLIER_CASE_REFERENCE_TYPES)[number];
