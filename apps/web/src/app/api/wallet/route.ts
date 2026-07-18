import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';

interface TenantWalletRow {
  id: string;
  tenant_id: string;
  balance: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

/**
 * Real billing foundation: reads (and lazily creates) the tenant's wallet
 * row. There is no payment-processor integration yet — this only exposes
 * what already exists in the schema. Real balance mutation (accepting
 * payments) is a separate, later milestone pending a Product Owner
 * decision on a payment provider.
 */
export async function GET(request: NextRequest) {
  try {
    let session;
    try {
      session = await requireSession(request);
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        return NextResponse.json(
          { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
          { status: 401 }
        );
      }
      throw error;
    }

    const db = new DatabaseClient();

    const existing = await db.execute<TenantWalletRow>(
      session.tenantId,
      `SELECT id, tenant_id, balance, currency, created_at, updated_at FROM "TenantWallet" WHERE tenant_id = $1`,
      [session.tenantId]
    );
    if (existing.length > 0) {
      return NextResponse.json({ wallet: existing[0] }, { status: 200 });
    }

    // No wallet yet for this tenant (nothing has provisioned one) — create
    // it lazily with a zero balance rather than 404ing on a concept that
    // should always exist for an active tenant.
    const created = await db.execute<TenantWalletRow>(
      session.tenantId,
      `INSERT INTO "TenantWallet" (tenant_id)
       VALUES ($1)
       ON CONFLICT (tenant_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
       RETURNING id, tenant_id, balance, currency, created_at, updated_at`,
      [session.tenantId]
    );
    return NextResponse.json({ wallet: created[0] }, { status: 200 });
  } catch (error) {
    console.error('[WALLET_API] GET /api/wallet failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
