/**
 * Shared between /api/matters/[id]/parties and any future consumer — kept
 * out of the route.ts file so it's a normal importable module.
 */
export const REPRESENTED_SIDES = ['OUR_CLIENT', 'OPPOSING', 'THIRD_PARTY'] as const;
export type RepresentedSide = (typeof REPRESENTED_SIDES)[number];
