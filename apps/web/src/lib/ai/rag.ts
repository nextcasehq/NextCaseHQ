import { hybridSearch, type HybridSearchResult } from '@/lib/search/hybrid-search';
import { getLLMProvider } from './llm-provider';
import type { ChatMessage } from './types';
import { buildPrompt } from './prompt-builder';
import { getMatterContext, renderContext } from './context/gateway';
import { recordAiUsageEvent, estimateTokenCount } from './usage-metering';

const CONTEXT_CHUNK_LIMIT = 5;
const MAX_SNIPPET_LENGTH = 1000;

const SYSTEM_PROMPT =
  'You are a legal research assistant for NextCaseHQ. Answer the question using ONLY the numbered ' +
  'context excerpts provided below — never rely on outside knowledge. Cite the excerpt number(s) you ' +
  'used in square brackets, e.g. [1], [2]. If the excerpts do not contain enough information to answer, ' +
  'say so plainly rather than guessing.';

const MATTER_CONTEXT_INSTRUCTIONS =
  'You also have real, structured context about the current matter below — use it together with any ' +
  'retrieved document excerpts to answer precisely.';

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

export interface AskQuestionOptions {
  caseId?: string | null;
  matterId?: string | null;
}

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
 * index, optionally enriched with a Matter's real structured context via
 * the AI Context Gateway (lib/ai/context/gateway.ts) when matterId is
 * given. Grounds the LLM's answer in whichever of the two sources are
 * available and returns the answer alongside the exact source chunks
 * cited — so the caller can render "Sources" the same way any
 * legal-research tool would, not just a bare chat reply.
 *
 * Follows the fixed pipeline every AI request must take: Authorization +
 * enforceEntitlement() + Context Builder + Context Ranking all happen
 * inside getMatterContext() when matterId is given; Prompt Builder
 * assembles the layered prompt below; the Provider Gateway
 * (getLLMProvider()) makes the actual call; Usage Metering
 * (recordAiUsageEvent) and Audit Logging follow immediately after,
 * whether the call succeeds or fails — never skipped, never routed around.
 *
 * A cross-tenant or nonexistent matterId fails closed (MatterNotFoundError
 * propagates to the caller) before any of this runs, and before any usage
 * event is recorded — an authorization failure is not a metered AI
 * operation, since no provider call was ever attempted.
 */
export async function askQuestion(
  tenantId: string,
  userId: string,
  query: string,
  options?: AskQuestionOptions
): Promise<AskQuestionResult> {
  const caseId = options?.caseId ?? null;
  const matterId = options?.matterId ?? null;

  const chunks = await hybridSearch(tenantId, query, { caseId, limit: CONTEXT_CHUNK_LIMIT });

  let matterContextText: string | undefined;
  if (matterId) {
    const gatewayResult = await getMatterContext(tenantId, userId, matterId, { operationType: 'AI_CHAT' });
    matterContextText = renderContext(gatewayResult.items);
  }

  if (chunks.length === 0 && !matterContextText) {
    return { status: 'NO_CONTEXT_FOUND' };
  }

  const { block, sources } = buildContextBlock(chunks);
  const messages: ChatMessage[] = buildPrompt({
    systemPolicies: SYSTEM_PROMPT,
    instructions: matterContextText ? MATTER_CONTEXT_INSTRUCTIONS : '',
    matterContext: matterContextText,
    retrievedDocuments: block || undefined,
    userRequest: query,
  });

  const provider = getLLMProvider();
  const estimatedContextSize = (matterContextText?.length ?? 0) + block.length;
  const estimatedProviderTokens = estimateTokenCount(messages.map((m) => m.content).join('\n'));

  let result;
  try {
    result = await provider.generateChatCompletion(messages);
  } catch (error) {
    await recordAiUsageEvent({
      tenantId,
      userId,
      matterId,
      proceedingId: caseId,
      operationType: 'AI_CHAT',
      provider: provider.name,
      estimatedContextSize,
      estimatedProviderTokens,
      status: 'FAILED',
    });
    console.error(
      `[AI_AUDIT] operation=AI_CHAT tenant=${tenantId} user=${userId} matter=${matterId ?? 'none'} status=FAILED`
    );
    throw error;
  }

  await recordAiUsageEvent({
    tenantId,
    userId,
    matterId,
    proceedingId: caseId,
    operationType: 'AI_CHAT',
    provider: provider.name,
    model: result.model,
    estimatedContextSize,
    estimatedProviderTokens,
    status: 'SUCCESS',
  });
  console.log(
    `[AI_AUDIT] operation=AI_CHAT tenant=${tenantId} user=${userId} matter=${matterId ?? 'none'} ` +
      `status=SUCCESS provider=${provider.name} model=${result.model}`
  );

  return {
    status: 'ANSWERED',
    answer: result.content,
    sources,
    provider: provider.name,
    model: result.model,
  };
}
