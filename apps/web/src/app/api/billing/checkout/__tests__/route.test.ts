import { NextRequest } from 'next/server';
import { POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { getPaymentProvider } from '@/lib/billing/payment-provider';
import { PaymentProviderNotConfiguredError, PaymentProviderRequestError } from '@/lib/billing/errors';

jest.mock('@/lib/billing/payment-provider');
const mockedGetPaymentProvider = getPaymentProvider as jest.MockedFunction<typeof getPaymentProvider>;

const TENANT_ID = '00000000-0000-4000-8000-000000000ac1';
const USER_ID = '00000000-0000-4000-8000-000000000ac2';

async function sessionCookieHeader(): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId: TENANT_ID, email: 'billing-checkout-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/billing/checkout'), {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    mockedGetPaymentProvider.mockReset();
  });

  test('rejects with no session (401)', async () => {
    const res = await POST(buildRequest({}, { amount: 5000 }));
    expect(res.status).toBe(401);
  });

  test('rejects a non-positive amount (400)', async () => {
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { amount: -1 }));
    expect(res.status).toBe(400);
  });

  test('rejects an untrusted origin (403)', async () => {
    const res = await POST(
      new NextRequest(new URL('http://localhost/api/billing/checkout'), {
        method: 'POST',
        headers: { origin: 'https://evil.example.com', cookie: await sessionCookieHeader() },
        body: JSON.stringify({ amount: 5000 }),
      })
    );
    expect(res.status).toBe(403);
  });

  test('returns 503 when the payment provider is not configured', async () => {
    mockedGetPaymentProvider.mockImplementation(() => {
      throw new PaymentProviderNotConfiguredError();
    });
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { amount: 5000 }));
    expect(res.status).toBe(503);
  });

  test('returns 502 when the provider request fails', async () => {
    mockedGetPaymentProvider.mockReturnValue({
      name: 'stripe',
      createCheckoutSession: jest.fn().mockRejectedValue(new PaymentProviderRequestError('boom', 'stripe')),
      parseWebhookEvent: jest.fn(),
    });
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { amount: 5000 }));
    expect(res.status).toBe(502);
  });

  test('returns the checkout URL on success and passes the tenant id through', async () => {
    const mockCreateCheckoutSession = jest.fn().mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/cs_test_1' });
    mockedGetPaymentProvider.mockReturnValue({
      name: 'stripe',
      createCheckoutSession: mockCreateCheckoutSession,
      parseWebhookEvent: jest.fn(),
    });

    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { amount: 5000, currency: 'usd' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkout_url).toBe('https://checkout.stripe.com/cs_test_1');
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, amount: 5000, currency: 'usd' })
    );
  });
});
