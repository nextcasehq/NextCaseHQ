import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000f31';
const TENANT_B = '00000000-0000-4000-8000-000000000f32';
const USER_ID = '00000000-0000-4000-8000-000000000f33';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'wallet-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/wallet'), { headers });
}

describe('GET /api/wallet', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Wallet Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Wallet Test Tenant B',
    ]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "TenantWallet" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "TenantWallet" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  test('rejects with no session (401)', async () => {
    const res = await GET(buildRequest({}));
    expect(res.status).toBe(401);
  });

  test('lazily creates a zero-balance wallet on first read', async () => {
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wallet.tenant_id).toBe(TENANT_A);
    expect(Number(body.wallet.balance)).toBe(0);
    expect(body.wallet.currency).toBe('INR');
  });

  test('returns the same wallet on a second read rather than creating a duplicate', async () => {
    const first = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }));
    const firstBody = await first.json();
    const second = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }));
    const secondBody = await second.json();
    expect(secondBody.wallet.id).toBe(firstBody.wallet.id);
  });

  test("never returns another tenant's wallet", async () => {
    const resA = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }));
    const bodyA = await resA.json();

    const resB = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }));
    const bodyB = await resB.json();

    expect(bodyB.wallet.id).not.toBe(bodyA.wallet.id);
    expect(bodyB.wallet.tenant_id).toBe(TENANT_B);
  });
});
