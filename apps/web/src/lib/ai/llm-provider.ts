import type { LLMProvider } from './types';
import { AIProviderNotConfiguredError } from './errors';
import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';

/**
 * Provider-agnostic LLM selection. AI_PROVIDER picks which vendor backs
 * every call site in this app (lib/ai/rag.ts, POST /api/ai/ask) — none of
 * them import a vendor SDK directly, only this factory and the
 * LLMProvider interface. OpenAI is the default (first supported
 * provider); Anthropic is the second, selected the same way. Adding a
 * third provider later means adding one more branch here, not touching
 * any call site.
 */

export type AIProviderName = 'openai' | 'anthropic';

function resolveProviderName(): AIProviderName {
  const configured = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (configured !== 'openai' && configured !== 'anthropic') {
    throw new AIProviderNotConfiguredError(
      `AI_PROVIDER must be "openai" or "anthropic" (got "${configured}").`
    );
  }
  return configured;
}

let provider: LLMProvider | null | undefined;

function buildProvider(): LLMProvider | null {
  const name = resolveProviderName();

  if (name === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    return new OpenAIProvider(apiKey, process.env.OPENAI_MODEL || undefined);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new AnthropicProvider(apiKey, process.env.ANTHROPIC_MODEL || undefined);
}

export function isAIProviderConfigured(): boolean {
  if (provider === undefined) {
    provider = buildProvider();
  }
  return provider !== null;
}

export function getLLMProvider(): LLMProvider {
  if (provider === undefined) {
    provider = buildProvider();
  }
  if (!provider) {
    throw new AIProviderNotConfiguredError(
      `AI provider "${resolveProviderName()}" is not configured — its API key env var is unset.`
    );
  }
  return provider;
}

/** Test-only: force re-evaluation of AI_PROVIDER/OPENAI_API_KEY/ANTHROPIC_API_KEY env vars. */
export function __resetLLMProviderForTests(): void {
  provider = undefined;
}
