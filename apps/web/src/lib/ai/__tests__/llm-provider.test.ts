import { getLLMProvider, isAIProviderConfigured, __resetLLMProviderForTests } from '../llm-provider';
import { AIProviderNotConfiguredError } from '../errors';

const ENV_KEYS = ['AI_PROVIDER', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] as const;
type EnvKey = (typeof ENV_KEYS)[number];

function snapshotEnv(): Record<EnvKey, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]])) as Record<EnvKey, string | undefined>;
}

function restoreEnv(snapshot: Record<EnvKey, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

describe('getLLMProvider / isAIProviderConfigured', () => {
  let originalEnv: Record<EnvKey, string | undefined>;

  beforeEach(() => {
    originalEnv = snapshotEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    __resetLLMProviderForTests();
  });

  afterEach(() => {
    restoreEnv(originalEnv);
    __resetLLMProviderForTests();
  });

  test('is not configured when no API key is set', () => {
    expect(isAIProviderConfigured()).toBe(false);
  });

  test('throws AIProviderNotConfiguredError when getLLMProvider is called unconfigured', () => {
    expect(() => getLLMProvider()).toThrow(AIProviderNotConfiguredError);
  });

  test('selects OpenAI by default when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    __resetLLMProviderForTests();
    expect(isAIProviderConfigured()).toBe(true);
    expect(getLLMProvider().name).toBe('openai');
  });

  test('selects Anthropic when AI_PROVIDER=anthropic and ANTHROPIC_API_KEY is set', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    __resetLLMProviderForTests();
    expect(getLLMProvider().name).toBe('anthropic');
  });

  test('is not configured when AI_PROVIDER=anthropic but only OPENAI_API_KEY is set', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.OPENAI_API_KEY = 'sk-test-key';
    __resetLLMProviderForTests();
    expect(isAIProviderConfigured()).toBe(false);
  });

  test('throws for an unrecognized AI_PROVIDER value', () => {
    process.env.AI_PROVIDER = 'not-a-real-provider';
    __resetLLMProviderForTests();
    expect(() => getLLMProvider()).toThrow(AIProviderNotConfiguredError);
  });
});
