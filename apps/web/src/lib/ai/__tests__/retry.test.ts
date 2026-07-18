import { withRetry, isRetryableStatus } from '../retry';

describe('isRetryableStatus', () => {
  test('treats 429 as retryable', () => {
    expect(isRetryableStatus(429)).toBe(true);
  });

  test('treats 5xx as retryable', () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
  });

  test('treats 4xx (other than 429) as not retryable', () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });

  test('treats an undefined status (network error) as retryable', () => {
    expect(isRetryableStatus(undefined)).toBe(true);
  });
});

describe('withRetry', () => {
  test('returns the result immediately on success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, () => true, { baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on a retryable error and eventually succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, () => true, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('gives up and throws after exhausting maxRetries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, () => true, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial attempt + 2 retries
  });

  test('does not retry when shouldRetry returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('non-retryable'));
    await expect(withRetry(fn, () => false, { maxRetries: 3, baseDelayMs: 1 })).rejects.toThrow('non-retryable');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
