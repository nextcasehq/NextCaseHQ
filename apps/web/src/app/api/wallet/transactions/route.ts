import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';

interface WalletTransactionRow {
  id: string;
  wallet_id: string;
  amount: string;
  type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Real, tenant-scoped ledger read. Scoped via WalletTransactionRecord's own
 * tenant_id + RLS policy (added alongside this route) rather than the
 * wallet_id FK alone, which — like every FK — bypasses RLS for its own
 * referential-integrity check.
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

    const parsed = ListQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { limit, offset } = parsed.data;

    const db = new DatabaseClient();
    const [rows, countRows] = await Promise.all([
      db.execute<WalletTransactionRow>(
        session.tenantId,
        `SELECT id, wallet_id, amount, type, metadata, created_at
         FROM "WalletTransactionRecord"
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "WalletTransactionRecord"`,
        []
      ),
    ]);

    return NextResponse.json(
      { transactions: rows, total: countRows[0].count, limit, offset },
      { status: 200 }
    );
  } catch (error) {
    console.error('[WALLET_API] GET /api/wallet/transactions failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
