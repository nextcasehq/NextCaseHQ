/**
 * Shared between /api/matters and /api/matters/[id] — kept out of either
 * route.ts file so it's a normal importable module rather than a
 * secondary export off a Next.js route handler file.
 */
export const MATTER_STATUSES = ['ACTIVE', 'ON_HOLD', 'CLOSED', 'ARCHIVED'] as const;
export type MatterStatus = (typeof MATTER_STATUSES)[number];

export const MATTER_ENGAGEMENT_TYPES = [
  'LITIGATION',
  'PRE_LITIGATION',
  'ADVISORY',
  'CONTRACTUAL',
  'TRANSACTIONAL',
  'ARBITRATION',
  'MEDIATION',
  'COMPLIANCE',
  'INVESTIGATION',
  'OTHER',
] as const;
export type MatterEngagementType = (typeof MATTER_ENGAGEMENT_TYPES)[number];
