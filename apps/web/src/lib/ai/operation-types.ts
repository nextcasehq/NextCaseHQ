/**
 * Product Owner-frozen taxonomy of chargeable AI operations (Milestone 2,
 * Decision 3). Billing (when it exists) prices the operation_type, never
 * the underlying provider/model token count — see usage-metering.ts —
 * so switching LLM vendors never requires re-pricing. Only AI_CHAT has a
 * real caller today (POST /api/ai/ask); every other value is reserved for
 * a future milestone's own feature (Draft Builder, Evidence Workspace,
 * etc.) to use once it exists. Renaming an existing value is a breaking
 * migration for any already-recorded AiUsageEvent rows — new values may be
 * appended, but these must not be renamed.
 */
export const AI_OPERATION_TYPES = [
  'AI_CHAT',
  'DRAFT_CREATE',
  'DRAFT_IMPROVE',
  'LEGAL_RESEARCH',
  'DOCUMENT_SUMMARIZE',
  'DOCUMENT_COMPARE',
  'OCR',
  'TRANSLATION',
  'CITATION_ANALYSIS',
  'TIMELINE_ANALYSIS',
  'EVIDENCE_ANALYSIS',
  'TEMPLATE_GENERATION',
  'MATTER_CONTEXT',
  'EMBEDDING',
  'RERANKING',
] as const;

export type AiOperationType = (typeof AI_OPERATION_TYPES)[number];
