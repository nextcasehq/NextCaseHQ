/**
 * Shared exponential-backoff retry helper for AI provider calls. Retries
 * only on errors classified as transient (rate limits, server errors,
 * network failures) — never on 4xx client errors like an invalid API key
 * or a malformed request, which will fail identically on every retry.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;

/** True for HTTP 429 and 5xx — the class of errors worth retrying. */
export function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) return true; // network error, no status at all
  return status === 429 || (status >= 500 && status < 600);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  // Unreachable — the loop above always either returns or throws — but
  // keeps the compiler happy about a guaranteed return type.
  throw lastError;
}
