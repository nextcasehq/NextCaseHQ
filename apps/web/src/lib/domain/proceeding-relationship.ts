/**
 * Shared between /api/matters/[id]/proceedings and any future consumer —
 * describes how a new Proceeding (LegalCase) relates to the prior one in
 * its Matter's proceeding chain (trial -> appeal -> revision -> execution).
 * A "Further Proceeding" is always a NEW row using one of these
 * relationships, never a mutation of the prior proceeding.
 */
export const PROCEEDING_RELATIONSHIP_TYPES = [
  'APPEAL',
  'REVISION',
  'REVIEW',
  'WRIT',
  'SLP',
  'EXECUTION',
  'COMPLIANCE',
  'REMAND',
  'RESTORATION',
  'RECALL',
  'CONNECTED_PROCEEDING',
  'OTHER',
] as const;
export type ProceedingRelationshipType = (typeof PROCEEDING_RELATIONSHIP_TYPES)[number];
