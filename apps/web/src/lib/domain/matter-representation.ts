/**
 * Shared between /api/matters/[id]/representation and any future consumer.
 * Foundation only — this milestone does not implement the paid
 * change-of-advocate commercial workflow.
 */
export const REPRESENTATION_ROLES = [
  'LEAD_ADVOCATE',
  'ASSISTING_ADVOCATE',
  'SENIOR_COUNSEL',
  'JUNIOR_COUNSEL',
  'ADVOCATE_ON_RECORD',
  'LOCAL_COUNSEL',
  'APPEARANCE_COUNSEL',
  'AUTHORISED_STAFF',
] as const;
export type RepresentationRole = (typeof REPRESENTATION_ROLES)[number];

export const REPRESENTATION_ACCESS_STATUSES = ['ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
export type RepresentationAccessStatus = (typeof REPRESENTATION_ACCESS_STATUSES)[number];
