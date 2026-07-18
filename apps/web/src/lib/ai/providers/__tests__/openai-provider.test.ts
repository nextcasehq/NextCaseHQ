import { APIError } from 'openai';
import { OpenAIProvider } from '../openai-provider';
import { AIRateLimitError, AIProviderRequestError } from '../../errors';

const mockCreate = jest.fn();

jest.mock('openai', () => {
  const actual = jest.requireActual('openai');
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    APIError: actual.APIError,
  };
});

function buildAPIError(status: number): Error {
  const error = new APIError(status, { message: 'boom' }, 'boom', undefined as any);
  return error;
}

describe('OpenAIProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test('returns the completion content, usage, and model on success', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'The answer is 42.' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      model: 'gpt-4o-mini',
    });

    const provider = new OpenAIProvider('sk-test');
    const result = await provider.generateChatCompletion([{ role: 'user', content: 'What is the answer?' }]);

    expect(result.content).toBe('The answer is 42.');
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(result.model).toBe('gpt-4o-mini');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('retries on a 429 and succeeds on the second attempt', async () => {
    mockCreate.mockRejectedValueOnce(buildAPIError(429)).mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      model: 'gpt-4o-mini',
    });

    const provider = new OpenAIProvider('sk-test');
    const result = await provider.generateChatCompletion([{ role: 'user', content: 'hi' }]);

    expect(result.content).toBe('ok');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  test('throws AIRateLimitError after exhausting retries on repeated 429s', async () => {
    mockCreate.mockRejectedValue(buildAPIError(429));

    const provider = new OpenAIProvider('sk-test');
    await expect(provider.generateChatCompletion([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      AIRateLimitError
    );
  });

  test('throws AIProviderRequestError without retrying on a 400', async () => {
    mockCreate.mockRejectedValue(buildAPIError(400));

    const provider = new OpenAIProvider('sk-test');
    await expect(provider.generateChatCompletion([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      AIProviderRequestError
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
