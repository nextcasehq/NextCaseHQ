import { hybridSearch, type HybridSearchResult } from '@/lib/search/hybrid-search';
import { getLLMProvider } from './llm-provider';
import type { ChatMessage } from './types';

const CONTEXT_CHUNK_LIMIT = 5;
const MAX_SNIPPET_LENGTH = 1000;

const SYSTEM_PROMPT =
  'You are a legal research assistant for NextCaseHQ. Answer the question using ONLY the numbered ' +
  'context excerpts provided below — never rely on outside knowledge. Cite the excerpt number(s) you ' +
  'used in square brackets, e.g. [1], [2]. If the excerpts do not contain enough information to answer, ' +
  'say so plainly rather than guessing.';

export interface RagSource {
  index: number;
  id: string;
  envelope_id: string;
  chunk_index: number;
  snippet: string;
}

export type AskQuestionResult =
  | { status: 'ANSWERED'; answer: string; sources: RagSource[]; provider: string; model: string }
  | { status: 'NO_CONTEXT_FOUND' };

function buildContextBlock(chunks: HybridSearchResult[]): { block: string; sources: RagSource[] } {
  const sources: RagSource[] = chunks.map((chunk, i) => ({
    index: i + 1,
    id: chunk.id,
    envelope_id: chunk.envelope_id,
    chunk_index: chunk.chunk_index,
    snippet: (chunk.content ?? '').slice(0, MAX_SNIPPET_LENGTH),
  }));

  const block = sources.map((s) => `[${s.index}] ${s.snippet}`).join('\n\n');
  return { block, sources };
}

/**
 * RAG answer generation over the existing pgvector/full-text hybrid search
 * index: retrieves the most relevant chunks for the tenant (optionally
 * scoped to one case), grounds the LLM's answer in them, and returns the
 * answer alongside the exact source chunks cited — so the caller can
 * render "Sources" the same way any legal-research tool would, not just a
 * bare chat reply.
 */
export async function askQuestion(
  tenantId: string,
  query: string,
  caseId?: string | null
): Promise<AskQuestionResult> {
  const chunks = await hybridSearch(tenantId, query, { caseId, limit: CONTEXT_CHUNK_LIMIT });
  if (chunks.length === 0) {
    return { status: 'NO_CONTEXT_FOUND' };
  }

  const { block, sources } = buildContextBlock(chunks);
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Context excerpts:\n\n${block}\n\nQuestion: ${query}` },
  ];

  const provider = getLLMProvider();
  const result = await provider.generateChatCompletion(messages);

  return {
    status: 'ANSWERED',
    answer: result.content,
    sources,
    provider: provider.name,
    model: result.model,
  };
}
