import OpenAI, { APIError } from 'openai';
import type { ChatCompletionResult, ChatCompletionOptions, ChatMessage, LLMProvider } from '../types';
import { AIProviderRequestError, AIRateLimitError } from '../errors';
import { withRetry, isRetryableStatus } from '../retry';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResult> {
    try {
      const response = await withRetry(
        () =>
          this.client.chat.completions.create({
            model: this.model,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            max_tokens: options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
            temperature: options.temperature,
          }),
        (error) => error instanceof APIError && isRetryableStatus(error.status)
      );

      const choice = response.choices[0];
      return {
        content: choice?.message?.content ?? '',
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
        model: response.model,
      };
    } catch (error) {
      if (error instanceof APIError && error.status === 429) {
        throw new AIRateLimitError(this.name, error);
      }
      throw new AIProviderRequestError(`OpenAI chat completion failed: ${(error as Error).message}`, this.name, error);
    }
  }
}
