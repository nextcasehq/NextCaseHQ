/**
 * Shared between /api/matters/[id]/tasks and its [taskId] sub-route —
 * kept out of either route.ts file so it's a normal importable module.
 */
export const MATTER_TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'OVERDUE',
  'CANCELLED',
  'DISMISSED',
] as const;
export type MatterTaskStatus = (typeof MATTER_TASK_STATUSES)[number];

export const MATTER_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type MatterTaskPriority = (typeof MATTER_TASK_PRIORITIES)[number];
