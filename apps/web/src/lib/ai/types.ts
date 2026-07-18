export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionOptions {
  /** Caps output length; providers map this to their own token-limit parameter. */
  maxOutputTokens?: number;
  temperature?: number;
}

export interface ChatCompletionUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  usage: ChatCompletionUsage;
  model: string;
}

/**
 * Provider-agnostic chat-completion interface — the same shape regardless
 * of which vendor backs it, so lib/ai/rag.ts and API routes never import a
 * vendor SDK directly. Concrete implementations: providers/openai-provider
 * .ts (default), providers/anthropic-provider.ts (second supported
 * provider), selected via getLLMProvider() in llm-provider.ts.
 */
export interface LLMProvider {
  readonly name: string;
  generateChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult>;
}
