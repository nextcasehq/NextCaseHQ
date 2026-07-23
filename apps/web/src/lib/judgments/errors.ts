/**
 * apps/web compiles to ES5 (see tsconfig.json), where `class X extends
 * Error` doesn't correctly wire up the prototype chain unless restored
 * manually — otherwise `error instanceof JudgmentProviderError` is
 * silently false. Same pattern as lib/ai/errors.ts and
 * lib/auth/session.ts's UnauthenticatedError.
 */

/** A provider id was requested that isn't registered. Recoverable —
 * callers fall back to the placeholder provider rather than crash. */
export class JudgmentProviderNotFoundError extends Error {
  constructor(public readonly providerId: string) {
    super(`Judgment provider "${providerId}" is not registered.`);
    Object.setPrototypeOf(this, JudgmentProviderNotFoundError.prototype);
  }
}

/** A registered provider exists but declined to serve the request (e.g.
 * the placeholder provider, or a real provider that's misconfigured). */
export class JudgmentProviderUnavailableError extends Error {
  constructor(public readonly providerId: string, message?: string) {
    super(message ?? `Judgment provider "${providerId}" is unavailable.`);
    Object.setPrototypeOf(this, JudgmentProviderUnavailableError.prototype);
  }
}

/** A real provider's underlying request failed (network, auth, rate
 * limit, malformed response). Not thrown by the placeholder provider,
 * which never makes a request. */
export class JudgmentProviderRequestError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, JudgmentProviderRequestError.prototype);
  }
}
