/**
 * Shared between /api/matters/[id]/close, /api/matters/[id]/reopen, and any
 * future consumer.
 */
export const MATTER_CLOSURE_REASONS = [
  'FINAL_JUDGMENT_OR_ORDER',
  'SETTLEMENT_OR_COMPROMISE',
  'WITHDRAWAL',
  'DISMISSAL',
  'MATTER_DISPOSED',
  'DECREE_SATISFIED',
  'EXECUTION_COMPLETED',
  'TRANSFER',
  'FURTHER_PROCEEDING_INITIATED',
  'CLIENT_INSTRUCTION_TO_DISCONTINUE',
  'REPRESENTATION_ENDED',
  'DUPLICATE_REGISTER_MERGED',
  'OTHER',
] as const;
export type MatterClosureReason = (typeof MATTER_CLOSURE_REASONS)[number];

export const MATTER_REOPENING_REASONS = [
  'RESTORATION',
  'RECALL',
  'REVIEW',
  'EXECUTION',
  'COMPLIANCE',
  'REMAND',
  'FRESH_ORDER',
  'INCORRECT_CLOSURE',
  'OTHER',
] as const;
export type MatterReopeningReason = (typeof MATTER_REOPENING_REASONS)[number];

/**
 * The advocate must actively confirm this exact statement (not merely click
 * a button) before a closure is recorded — enforced by the API route
 * requiring the request body's confirmation_statement to match verbatim.
 */
export const MATTER_CLOSURE_CONFIRMATION_STATEMENT =
  'I confirm that I have reviewed the matter outcome, pending obligations, limitation dates, client communication, documents and account status, and approve closure of this Matter Register.';
