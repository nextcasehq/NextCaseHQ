import { APIError } from '@anthropic-ai/sdk';
import { AnthropicProvider } from '../anthropic-provider';
import { AIRateLimitError, AIProviderRequestError } from '../../errors';

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  const actual = jest.requireActual('@anthropic-ai/sdk');
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    APIError: actual.APIError,
  };
});

function buildAPIError(status: number): Error {
  return new APIError(status, { message: 'boom' }, 'boom', undefined as any);
}

describe('AnthropicProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test('returns the completion content, usage, and model on success, splitting out the system message', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'The answer is 42.' }],
      usage: { input_tokens: 20, output_tokens: 8 },
      model: 'claude-3-5-haiku-latest',
    });

    const provider = new AnthropicProvider('sk-ant-test');
    const result = await provider.generateChatCompletion([
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'What is the answer?' },
    ]);

    expect(result.content).toBe('The answer is 42.');
    expect(result.usage).toEqual({ inputTokens: 20, outputTokens: 8 });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'Be concise.',
        messages: [{ role: 'user', content: 'What is the answer?' }],
      })
    );
  });

  test('retries on a 429 and succeeds on the second attempt', async () => {
    mockCreate.mockRejectedValueOnce(buildAPIError(429)).mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-3-5-haiku-latest',
    });

    const provider = new AnthropicProvider('sk-ant-test');
    const result = await provider.generateChatCompletion([{ role: 'user', content: 'hi' }]);

    expect(result.content).toBe('ok');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  test('throws AIRateLimitError after exhausting retries on repeated 429s', async () => {
    mockCreate.mockRejectedValue(buildAPIError(429));

    const provider = new AnthropicProvider('sk-ant-test');
    await expect(provider.generateChatCompletion([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      AIRateLimitError
    );
  });

  test('throws AIProviderRequestError without retrying on a 400', async () => {
    mockCreate.mockRejectedValue(buildAPIError(400));

    const provider = new AnthropicProvider('sk-ant-test');
    await expect(provider.generateChatCompletion([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      AIProviderRequestError
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
