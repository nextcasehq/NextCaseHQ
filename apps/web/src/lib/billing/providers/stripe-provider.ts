import Stripe from 'stripe';
import type { PaymentProvider, CreateCheckoutSessionParams, CheckoutSession, WalletTopUpEvent } from '../types';
import { PaymentProviderRequestError, WebhookSignatureVerificationError } from '../errors';

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';
  private readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    // Stripe's own SDK already implements exponential-backoff retry with
    // idempotency keys for transient network/5xx failures — wrapping it in
    // a second, ad hoc retry layer would be redundant.
    this.client = new Stripe(secretKey, { maxNetworkRetries: 2 });
    this.webhookSecret = webhookSecret;
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    try {
      const session = await this.client.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: params.currency,
              product_data: { name: 'NextCaseHQ Wallet Top-Up' },
              unit_amount: params.amount,
            },
            quantity: 1,
          },
        ],
        // Read back in parseWebhookEvent to know which tenant's wallet to
        // credit — the webhook itself carries no session cookie.
        metadata: { tenant_id: params.tenantId },
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      });

      if (!session.url) {
        throw new Error('Stripe did not return a checkout URL.');
      }
      return { id: session.id, url: session.url };
    } catch (error) {
      throw new PaymentProviderRequestError(
        `Stripe checkout session creation failed: ${(error as Error).message}`,
        this.name,
        error
      );
    }
  }

  parseWebhookEvent(rawBody: string, signatureHeader: string | null): WalletTopUpEvent | null {
    if (!signatureHeader) {
      throw new WebhookSignatureVerificationError('Missing Stripe-Signature header.');
    }

    let event: Stripe.Event;
    try {
      event = this.client.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
    } catch (error) {
      throw new WebhookSignatureVerificationError(
        `Stripe webhook signature verification failed: ${(error as Error).message}`
      );
    }

    if (event.type !== 'checkout.session.completed') {
      return null;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.metadata?.tenant_id;
    if (!tenantId || session.amount_total == null || !session.currency) {
      return null;
    }

    return {
      tenantId,
      amount: session.amount_total,
      currency: session.currency,
      providerReference: session.id,
    };
  }
}
