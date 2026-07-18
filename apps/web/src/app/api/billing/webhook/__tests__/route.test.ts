import { NextRequest } from 'next/server';
import { POST } from '../route';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { getPaymentProvider } from '@/lib/billing/payment-provider';
import { PaymentProviderNotConfiguredError, WebhookSignatureVerificationError } from '@/lib/billing/errors';

jest.mock('@/lib/billing/payment-provider');
const mockedGetPaymentProvider = getPaymentProvider as jest.MockedFunction<typeof getPaymentProvider>;

const TENANT_A = '00000000-0000-4000-8000-000000000ad1';

function buildRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL('http://localhost/api/billing/webhook'), {
    method: 'POST',
    headers: { 'stripe-signature': 'test-sig', ...headers },
    body,
  });
}

describe('POST /api/billing/webhook', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Billing Webhook Test Tenant A',
    ]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "WalletTransactionRecord" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "TenantWallet" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  beforeEach(() => {
    mockedGetPaymentProvider.mockReset();
  });

  test('returns 401 when the webhook signature does not verify', async () => {
    mockedGetPaymentProvider.mockReturnValue({
      name: 'stripe',
      createCheckoutSession: jest.fn(),
      parseWebhookEvent: jest.fn().mockImplementation(() => {
        throw new WebhookSignatureVerificationError('bad signature');
      }),
    });
    const res = await POST(buildRequest('{}'));
    expect(res.status).toBe(401);
  });

  test('returns 503 when the payment provider is not configured', async () => {
    mockedGetPaymentProvider.mockImplementation(() => {
      throw new PaymentProviderNotConfiguredError();
    });
    const res = await POST(buildRequest('{}'));
    expect(res.status).toBe(503);
  });

  test('returns 200 IGNORED for an event type the app does not act on', async () => {
    mockedGetPaymentProvider.mockReturnValue({
      name: 'stripe',
      createCheckoutSession: jest.fn(),
      parseWebhookEvent: jest.fn().mockReturnValue(null),
    });
    const res = await POST(buildRequest('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('IGNORED');
  });

  test('credits the wallet and records a transaction on a completed checkout session', async () => {
    mockedGetPaymentProvider.mockReturnValue({
      name: 'stripe',
      createCheckoutSession: jest.fn(),
      parseWebhookEvent: jest.fn().mockReturnValue({
        tenantId: TENANT_A,
        amount: 50000, // paise -> 500.00 in major units
        currency: 'inr',
        providerReference: 'cs_test_unique_1',
      }),
    });

    const res = await POST(buildRequest('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('CREDITED');

    const walletRows = await db.execute<{ balance: string }>(
      TENANT_A,
      `SELECT balance FROM "TenantWallet" WHERE tenant_id = $1`,
      [TENANT_A]
    );
    expect(Number(walletRows[0].balance)).toBe(500);

    const txnRows = await db.execute(
      TENANT_A,
      `SELECT amount, type FROM "WalletTransactionRecord" WHERE metadata->>'stripe_session_id' = $1`,
      ['cs_test_unique_1']
    );
    expect(txnRows).toHaveLength(1);
  });

  test('is idempotent: replaying the same event does not double-credit the wallet', async () => {
    mockedGetPaymentProvider.mockReturnValue({
      name: 'stripe',
      createCheckoutSession: jest.fn(),
      parseWebhookEvent: jest.fn().mockReturnValue({
        tenantId: TENANT_A,
        amount: 10000,
        currency: 'inr',
        providerReference: 'cs_test_unique_2',
      }),
    });

    const first = await POST(buildRequest('{}'));
    expect((await first.json()).status).toBe('CREDITED');

    const second = await POST(buildRequest('{}'));
    expect(second.status).toBe(200);
    expect((await second.json()).status).toBe('ALREADY_PROCESSED');

    const txnRows = await db.execute(
      TENANT_A,
      `SELECT id FROM "WalletTransactionRecord" WHERE metadata->>'stripe_session_id' = $1`,
      ['cs_test_unique_2']
    );
    expect(txnRows).toHaveLength(1);
  });
});
