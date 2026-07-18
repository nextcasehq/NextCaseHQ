/**
 * apps/web compiles to ES5 (see tsconfig.json), where `class X extends
 * Error` doesn't correctly wire up the prototype chain unless restored
 * manually — same pattern as lib/auth/session.ts's UnauthenticatedError
 * and lib/ai/errors.ts.
 */

export class PaymentProviderNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, PaymentProviderNotConfiguredError.prototype);
  }
}

export class PaymentProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, PaymentProviderRequestError.prototype);
  }
}

/** The inbound webhook's signature didn't verify — never trust its payload. */
export class WebhookSignatureVerificationError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, WebhookSignatureVerificationError.prototype);
  }
}
