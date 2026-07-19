import { getLLMProvider } from './llm-provider';
import type { ChatMessage } from './types';
import { buildPrompt } from './prompt-builder';
import { getMatterContext, renderContext } from './context/gateway';
import { recordAiUsageEvent, estimateTokenCount } from './usage-metering';
import { getDocumentType, DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from '@/lib/domain/document-type';

const SYSTEM_PROMPT =
  'You are a legal drafting assistant for NextCaseHQ, preparing a formal Indian legal document for an advocate\'s ' +
  'review. Produce a properly structured, professionally worded draft using ONLY the facts supplied below — never ' +
  'invent facts, parties, dates, or citations not given to you. The advocate will review and edit every word before ' +
  'this draft is ever filed or saved; you are producing a first draft, not a final document.';

const IMPROVE_INSTRUCTIONS =
  'Revise the existing draft below according to the advocate\'s instruction, preserving its overall structure and ' +
  'every fact already present unless the instruction explicitly asks to change it. Return the complete revised ' +
  'document text, not just the changed portion.';

export interface GenerateDraftFacts {
  [key: string]: string;
}

export type DraftMode = 'CREATE' | 'IMPROVE';

export interface GenerateDraftOptions {
  tenantId: string;
  userId: string;
  documentTypeSlug: string;
  category: DocumentCategory;
  facts: GenerateDraftFacts;
  matterId?: string | null;
  mode: DraftMode;
  existingContent?: string | null;
  improveInstruction?: string | null;
}

export interface GenerateDraftResult {
  content: string;
  provider: string;
  model: string;
}

function renderFacts(facts: GenerateDraftFacts): string {
  return Object.entries(facts)
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value.trim()}`)
    .join('\n');
}

/**
 * DRAFT_CREATE / DRAFT_IMPROVE generation — the first real caller of these
 * two Product Owner-frozen AI_OPERATION_TYPES values (Milestone 2, Decision
 * 3). Follows the exact same fixed pipeline lib/ai/rag.ts's askQuestion()
 * already established for AI_CHAT: AI Context Gateway (when matterId is
 * given) → Prompt Builder → Provider Gateway → Usage Metering, in that
 * order, every time, whether the call succeeds or fails.
 *
 * Deliberately has NO database write of its own beyond the usage ledger
 * (recordAiUsageEvent) — generation and persistence stay fully separate
 * (Milestone 4 constraint: the drafting endpoint must never silently save
 * a draft). Saving is a distinct, later, explicit user action performed
 * through the existing document upload/version endpoints.
 */
export async function generateDraft(options: GenerateDraftOptions): Promise<GenerateDraftResult> {
  const { tenantId, userId, matterId = null } = options;
  const operationType = options.mode === 'IMPROVE' ? 'DRAFT_IMPROVE' : 'DRAFT_CREATE';

  let matterContextText: string | undefined;
  if (matterId) {
    const gatewayResult = await getMatterContext(tenantId, userId, matterId, { operationType });
    matterContextText = renderContext(gatewayResult.items);
  }

  const documentType = getDocumentType(options.documentTypeSlug);
  const typeLabel = documentType?.label ?? options.documentTypeSlug;
  const categoryLabel = DOCUMENT_CATEGORY_LABELS[options.category];
  const factsBlock = renderFacts(options.facts);

  const userRequest =
    `Draft a ${typeLabel} (${categoryLabel} matter).\n\n` +
    `Facts:\n${factsBlock || '(no additional facts supplied)'}` +
    (options.mode === 'IMPROVE' && options.improveInstruction
      ? `\n\nRevision instruction: ${options.improveInstruction}`
      : '');

  const messages: ChatMessage[] = buildPrompt({
    systemPolicies: SYSTEM_PROMPT,
    instructions: options.mode === 'IMPROVE' ? IMPROVE_INSTRUCTIONS : '',
    matterContext: matterContextText,
    existingDraft: options.mode === 'IMPROVE' ? options.existingContent ?? undefined : undefined,
    userRequest,
  });

  const provider = getLLMProvider();
  const estimatedContextSize = matterContextText?.length ?? 0;
  const estimatedProviderTokens = estimateTokenCount(messages.map((m) => m.content).join('\n'));

  let result;
  try {
    result = await provider.generateChatCompletion(messages);
  } catch (error) {
    await recordAiUsageEvent({
      tenantId,
      userId,
      matterId,
      operationType,
      provider: provider.name,
      estimatedContextSize,
      estimatedProviderTokens,
      status: 'FAILED',
    });
    console.error(
      `[AI_AUDIT] operation=${operationType} tenant=${tenantId} user=${userId} matter=${matterId ?? 'none'} status=FAILED`
    );
    throw error;
  }

  await recordAiUsageEvent({
    tenantId,
    userId,
    matterId,
    operationType,
    provider: provider.name,
    model: result.model,
    estimatedContextSize,
    estimatedProviderTokens,
    status: 'SUCCESS',
  });
  console.log(
    `[AI_AUDIT] operation=${operationType} tenant=${tenantId} user=${userId} matter=${matterId ?? 'none'} ` +
      `status=SUCCESS provider=${provider.name} model=${result.model}`
  );

  return { content: result.content, provider: provider.name, model: result.model };
}
