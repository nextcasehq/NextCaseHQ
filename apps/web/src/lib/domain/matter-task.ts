/**
 * Shared between /api/matters/[id]/tasks and its [taskId] sub-route —
 * kept out of either route.ts file so it's a normal importable module.
 */
export const MATTER_TASK_STATUSES = ['PENDING', 'COMPLETED', 'DISMISSED'] as const;
export type MatterTaskStatus = (typeof MATTER_TASK_STATUSES)[number];
