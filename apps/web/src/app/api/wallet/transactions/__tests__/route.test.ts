import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000f41';
const TENANT_B = '00000000-0000-4000-8000-000000000f42';
const USER_ID = '00000000-0000-4000-8000-000000000f43';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'wallet-txn-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(url: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url), { headers });
}

describe('GET /api/wallet/transactions', () => {
  const db = new DatabaseClient();
  let walletA: string;
  let walletB: string;

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Wallet Txn Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Wallet Txn Test Tenant B',
    ]);

    const walletRowsA = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "TenantWallet" (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
       RETURNING id`,
      [TENANT_A]
    );
    walletA = walletRowsA[0].id;

    const walletRowsB = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "TenantWallet" (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
       RETURNING id`,
      [TENANT_B]
    );
    walletB = walletRowsB[0].id;

    await db.execute(
      TENANT_A,
      `INSERT INTO "WalletTransactionRecord" (wallet_id, tenant_id, amount, type)
       VALUES ($1, $2, 500.00, 'CREDIT'), ($1, $2, -100.00, 'DEBIT')`,
      [walletA, TENANT_A]
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "WalletTransactionRecord" (wallet_id, tenant_id, amount, type)
       VALUES ($1, $2, 250.00, 'CREDIT')`,
      [walletB, TENANT_B]
    );
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "TenantWallet" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "TenantWallet" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  test('rejects with no session (401)', async () => {
    const res = await GET(buildRequest('http://localhost/api/wallet/transactions', {}));
    expect(res.status).toBe(401);
  });

  test("returns only the calling tenant's transactions", async () => {
    const res = await GET(
      buildRequest('http://localhost/api/wallet/transactions', { cookie: await sessionCookieHeader(TENANT_A) })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.transactions).toHaveLength(2);
    expect(body.transactions.every((t: { wallet_id: string }) => t.wallet_id === walletA)).toBe(true);
  });

  test("never returns another tenant's transactions even via direct table query (RLS, not just the FK)", async () => {
    const res = await GET(
      buildRequest('http://localhost/api/wallet/transactions', { cookie: await sessionCookieHeader(TENANT_B) })
    );
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.transactions[0].wallet_id).toBe(walletB);
  });

  test('honors limit/offset pagination', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/wallet/transactions?limit=1&offset=0', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    const body = await res.json();
    expect(body.transactions).toHaveLength(1);
    expect(body.total).toBe(2);
    expect(body.limit).toBe(1);
  });
});
