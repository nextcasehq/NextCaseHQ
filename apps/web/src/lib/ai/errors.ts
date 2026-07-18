/**
 * apps/web compiles to ES5 (see tsconfig.json), where `class X extends
 * Error` doesn't correctly wire up the prototype chain unless restored
 * manually — otherwise `error instanceof AIProviderError` is silently
 * false. Same pattern as lib/auth/session.ts's UnauthenticatedError.
 */

export class AIProviderNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, AIProviderNotConfiguredError.prototype);
  }
}

/** A request to the provider's API failed after exhausting retries. */
export class AIProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, AIProviderRequestError.prototype);
  }
}

/** The provider rejected the request for rate-limiting reasons (HTTP 429). */
export class AIRateLimitError extends AIProviderRequestError {
  constructor(provider: string, cause?: unknown) {
    super(`${provider} rate limit exceeded after retries.`, provider, cause);
    Object.setPrototypeOf(this, AIRateLimitError.prototype);
  }
}
