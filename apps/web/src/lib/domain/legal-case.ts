/**
 * Shared between /api/cases and /api/cases/[id] — kept out of either
 * route.ts file so it's a normal importable module rather than a
 * secondary export off a Next.js route handler file.
 */
export const CASE_STATUSES = ['PENDING', 'HEARING', 'DISPOSED', 'APPEAL'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
