import { searchJudgments } from '../judgment-research-service';
import type { JudgmentDocument } from '../types';
import type { JudgmentRetrievalForAI } from './types';

/**
 * The concrete implementation of JudgmentRetrievalForAI. Delegates to
 * searchJudgments() — the same orchestration path any other consumer
 * would use — so the AI Agent gets exactly the same entitlement
 * enforcement, provider resolution, usage tracking, and graceful error
 * handling as everything else, with no parallel code path of its own.
 *
 * Today this always resolves to an empty document list (the placeholder
 * provider never returns real documents), so any AI prompt built from
 * this must already handle "no judgments retrieved" gracefully — it must
 * never be assumed that judgments are available.
 */
export class JudgmentRetrievalService implements JudgmentRetrievalForAI {
  async retrieve(tenantId: string, userId: string, query: string, limit = 5): Promise<JudgmentDocument[]> {
    const result = await searchJudgments({ tenantId, userId, query, limit });
    return result.documents;
  }
}

export const judgmentRetrievalForAI: JudgmentRetrievalForAI = new JudgmentRetrievalService();
