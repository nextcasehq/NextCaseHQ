export interface CreateCheckoutSessionParams {
  tenantId: string;
  /** Smallest currency unit (e.g. paise for INR, cents for USD) — matches how every payment provider's API represents amounts. */
  amount: number;
  /** ISO 4217 currency code, lowercase (e.g. "inr", "usd"). */
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

/** A normalized "wallet should be credited" event, extracted from whatever event shape the underlying provider uses. */
export interface WalletTopUpEvent {
  tenantId: string;
  amount: number;
  currency: string;
  providerReference: string;
}

/**
 * Provider-agnostic payment interface — the same shape regardless of
 * vendor, so callers (POST /api/billing/checkout, POST /api/billing/
 * webhook) never import a vendor SDK directly. Concrete implementation:
 * providers/stripe-provider.ts (the Product Owner's selected first
 * provider), selected via getPaymentProvider() in payment-provider.ts.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession>;
  /**
   * Verifies the inbound webhook signature (throwing
   * WebhookSignatureVerificationError if it doesn't check out — never
   * trust an unverified payload) and, if the event represents a completed
   * payment, returns a normalized WalletTopUpEvent. Returns null for
   * event types this app doesn't act on (still a 200 to the provider).
   */
  parseWebhookEvent(rawBody: string, signatureHeader: string | null): WalletTopUpEvent | null;
}
