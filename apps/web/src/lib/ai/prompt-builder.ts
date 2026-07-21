import type { ChatMessage } from './types';

export interface PromptLayers {
  systemPolicies: string;
  instructions: string;
  matterContext?: string;
  retrievedDocuments?: string;
  /** The prior draft text being revised (DRAFT_IMPROVE only) — optional, additive; every existing caller that omits it is unaffected. */
  existingDraft?: string;
  userRequest: string;
}

/**
 * Assembles a prompt from fixed, ordered layers — system policies →
 * instructions → matter context → retrieved documents → user request —
 * rather than ad hoc string concatenation at each call site. Every AI
 * feature that needs matter or document context builds it through this
 * one function, so the layer order is a single, auditable invariant.
 *
 * Deliberately does no database access of its own — matterContext and
 * retrievedDocuments arrive pre-rendered from their own sources (the AI
 * Context Gateway, hybrid search), keeping this module a pure text
 * assembler (see lib/ai/__tests__/import-boundary.test.ts).
 */
export function buildPrompt(layers: PromptLayers): ChatMessage[] {
  const systemContent = [layers.systemPolicies, layers.instructions].filter(Boolean).join('\n\n');

  const userParts: string[] = [];
  if (layers.matterContext) {
    userParts.push(`Matter context:\n\n${layers.matterContext}`);
  }
  if (layers.retrievedDocuments) {
    userParts.push(`Context excerpts:\n\n${layers.retrievedDocuments}`);
  }
  if (layers.existingDraft) {
    userParts.push(`Existing draft to revise:\n\n${layers.existingDraft}`);
  }
  userParts.push(`Question: ${layers.userRequest}`);

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userParts.join('\n\n') },
  ];
}
