import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type { ChatCompletionResult, ChatCompletionOptions, ChatMessage, LLMProvider } from '../types';
import { AIProviderRequestError, AIRateLimitError } from '../errors';
import { withRetry, isRetryableStatus } from '../retry';

const DEFAULT_MODEL = 'claude-3-5-haiku-latest';
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResult> {
    // Anthropic's Messages API takes the system prompt as its own top-level
    // parameter rather than a message with role "system" — unlike OpenAI's
    // shape, which is why this provider can't just forward `messages` as-is.
    const systemPrompt = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const conversation = messages.filter((m) => m.role !== 'system') as Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;

    try {
      const response = await withRetry(
        () =>
          this.client.messages.create({
            model: this.model,
            max_tokens: options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
            temperature: options.temperature,
            system: systemPrompt || undefined,
            messages: conversation,
          }),
        (error) => error instanceof APIError && isRetryableStatus(error.status)
      );

      const textBlock = response.content.find((block) => block.type === 'text');
      return {
        content: textBlock && 'text' in textBlock ? textBlock.text : '',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        model: response.model,
      };
    } catch (error) {
      if (error instanceof APIError && error.status === 429) {
        throw new AIRateLimitError(this.name, error);
      }
      throw new AIProviderRequestError(
        `Anthropic chat completion failed: ${(error as Error).message}`,
        this.name,
        error
      );
    }
  }
}
