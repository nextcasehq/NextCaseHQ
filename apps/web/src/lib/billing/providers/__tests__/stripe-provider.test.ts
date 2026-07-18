import { StripePaymentProvider } from '../stripe-provider';
import { PaymentProviderRequestError, WebhookSignatureVerificationError } from '../../errors';

const mockCreate = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  }));
});

describe('StripePaymentProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockConstructEvent.mockReset();
  });

  describe('createCheckoutSession', () => {
    test('returns the session id and url on success', async () => {
      mockCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/cs_test_123' });

      const provider = new StripePaymentProvider('sk_test', 'whsec_test');
      const result = await provider.createCheckoutSession({
        tenantId: 'tenant-1',
        amount: 50000,
        currency: 'inr',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });

      expect(result).toEqual({ id: 'cs_test_123', url: 'https://checkout.stripe.com/cs_test_123' });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          metadata: { tenant_id: 'tenant-1' },
          success_url: 'https://app.example.com/success',
          cancel_url: 'https://app.example.com/cancel',
        })
      );
    });

    test('wraps a Stripe API failure in PaymentProviderRequestError', async () => {
      mockCreate.mockRejectedValue(new Error('card declined'));

      const provider = new StripePaymentProvider('sk_test', 'whsec_test');
      await expect(
        provider.createCheckoutSession({
          tenantId: 'tenant-1',
          amount: 100,
          currency: 'usd',
          successUrl: 'https://x/success',
          cancelUrl: 'https://x/cancel',
        })
      ).rejects.toBeInstanceOf(PaymentProviderRequestError);
    });

    test('throws PaymentProviderRequestError when Stripe returns no checkout URL', async () => {
      mockCreate.mockResolvedValue({ id: 'cs_test_123', url: null });

      const provider = new StripePaymentProvider('sk_test', 'whsec_test');
      await expect(
        provider.createCheckoutSession({
          tenantId: 'tenant-1',
          amount: 100,
          currency: 'usd',
          successUrl: 'https://x/success',
          cancelUrl: 'https://x/cancel',
        })
      ).rejects.toBeInstanceOf(PaymentProviderRequestError);
    });
  });

  describe('parseWebhookEvent', () => {
    test('throws WebhookSignatureVerificationError when the signature header is missing', () => {
      const provider = new StripePaymentProvider('sk_test', 'whsec_test');
      expect(() => provider.parseWebhookEvent('{}', null)).toThrow(WebhookSignatureVerificationError);
      expect(mockConstructEvent).not.toHaveBeenCalled();
    });

    test('throws WebhookSignatureVerificationError when Stripe rejects the signature', () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('signature mismatch');
      });
      const provider = new StripePaymentProvider('sk_test', 'whsec_test');
      expect(() => provider.parseWebhookEvent('{}', 'bad-sig')).toThrow(WebhookSignatureVerificationError);
    });

    test('returns null for an event type the app does not act on', () => {
      mockConstructEvent.mockReturnValue({ type: 'payment_intent.created', data: { object: {} } });
      const provider = new StripePaymentProvider('sk_test', 'whsec_test');
      expect(provider.parseWebhookEvent('{}', 'sig')).toBeNull();
    });

    test('returns null when checkout.session.completed is missing tenant_id metadata', () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_1', amount_total: 5000, currency: 'inr', metadata: {} } },
      });
      const provider = new StripePaymentProvider('sk_test', 'whsec_test');
      expect(provider.parseWebhookEvent('{}', 'sig')).toBeNull();
    });

    test('extracts a normalized WalletTopUpEvent from a completed checkout session', () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_456',
            amount_total: 75000,
            currency: 'inr',
            metadata: { tenant_id: 'tenant-42' },
          },
        },
      });
      const provider = new StripePaymentProvider('sk_test', 'whsec_test');
      const result = provider.parseWebhookEvent('{}', 'sig');
      expect(result).toEqual({
        tenantId: 'tenant-42',
        amount: 75000,
        currency: 'inr',
        providerReference: 'cs_test_456',
      });
    });
  });
});
