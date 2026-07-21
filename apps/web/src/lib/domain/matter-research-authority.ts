/**
 * Shared between /api/matters/[id]/research and any future consumer.
 * verification_status is intentionally never client-settable to
 * VERIFIED_OFFICIAL — every insert through this milestone's API is forced
 * to UNVERIFIED; a governed verification workflow is a later milestone.
 */
export const RESEARCH_AUTHORITY_VERIFICATION_STATUSES = [
  'DEMONSTRATION',
  'UNVERIFIED',
  'VERIFIED_OFFICIAL',
] as const;
export type ResearchAuthorityVerificationStatus = (typeof RESEARCH_AUTHORITY_VERIFICATION_STATUSES)[number];
