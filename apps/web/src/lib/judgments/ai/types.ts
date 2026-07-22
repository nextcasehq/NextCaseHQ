import type { JudgmentDocument } from '../types';

/**
 * What the AI Agent depends on for judgment retrieval — never a specific
 * provider, never a provider name. lib/ai/rag.ts (or any future AI
 * call site) imports this interface and judgmentRetrievalForAI (see
 * judgment-retrieval.ts), nothing else from this module. Plugging in a
 * real provider, adding a second provider, or combining several later
 * changes nothing here or at any AI call site.
 */
export interface JudgmentRetrievalForAI {
  retrieve(tenantId: string, userId: string, query: string, limit?: number): Promise<JudgmentDocument[]>;
}
