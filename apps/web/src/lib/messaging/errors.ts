/**
 * apps/web compiles to ES5 (see tsconfig.json), where `class X extends
 * Error` doesn't correctly wire up the prototype chain unless restored
 * manually — same pattern as lib/auth/session.ts's UnauthenticatedError,
 * lib/ai/errors.ts, and lib/billing/errors.ts.
 */

export class EmailProviderNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, EmailProviderNotConfiguredError.prototype);
  }
}

export class EmailProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, EmailProviderRequestError.prototype);
  }
}

export class SmsProviderNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, SmsProviderNotConfiguredError.prototype);
  }
}

export class SmsProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, SmsProviderRequestError.prototype);
  }
}
