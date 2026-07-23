/**
 * Court orders as first-class records (Case Diary Phase 1 closure) — see
 * db/schema.sql's CourtOrder table. Shared between /api/cases/[id]/orders
 * and any future consumer, same pattern as court-note.ts.
 */
export const CERTIFIED_COPY_STATUSES = ['NOT_REQUIRED', 'PENDING', 'APPLIED_FOR', 'RECEIVED'] as const;
export type CertifiedCopyStatus = (typeof CERTIFIED_COPY_STATUSES)[number];

export const CERTIFIED_COPY_STATUS_LABELS: Record<CertifiedCopyStatus, string> = {
  NOT_REQUIRED: 'Not Required',
  PENDING: 'Pending',
  APPLIED_FOR: 'Applied For',
  RECEIVED: 'Received',
};

// The advocate only ever chooses "required" or "not required" up front;
// the richer PENDING/APPLIED_FOR/RECEIVED lifecycle is something they
// advance later via PATCH, never a value they pick at creation time.
export function defaultCertifiedCopyStatus(required: boolean): CertifiedCopyStatus {
  return required ? 'PENDING' : 'NOT_REQUIRED';
}
