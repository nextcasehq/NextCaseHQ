import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DatabaseClient } from '@/lib/db/db-client';
import { getPaymentProvider } from '@/lib/billing/payment-provider';
import { PaymentProviderNotConfiguredError, WebhookSignatureVerificationError } from '@/lib/billing/errors';

interface WalletRow {
  id: string;
}

/**
 * Stripe webhook: credits the tenant's wallet once a checkout session
 * actually completes. Self-authorizing via Stripe's own signature scheme
 * (Stripe-Signature header, verified inside parseWebhookEvent) rather
 * than a session cookie — there is no browser session on a
 * server-to-server webhook call. Deliberately runs on the Node.js
 * runtime (the default — no `export const runtime = 'edge'` here),
 * since the Stripe SDK's webhook verification needs Node's crypto module.
 */
export async function POST(request: NextRequest) {
  try {
    // Signature covers the exact raw bytes — must read as text before any
    // JSON parsing, since re-serializing would change the signed content.
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('stripe-signature');

    let event;
    try {
      event = getPaymentProvider().parseWebhookEvent(rawBody, signatureHeader);
    } catch (error) {
      if (error instanceof WebhookSignatureVerificationError) {
        // The underlying reason (including the Stripe SDK's own internal
        // error text) is logged server-side only — this endpoint is public
        // and unauthenticated by design, so the response body must never
        // hand an attacker fingerprinting details about why verification
        // failed.
        console.error('[BILLING_API] webhook signature verification failed:', error.message);
        return NextResponse.json({ error: 'SECURE_ACCESS_DENIED' }, { status: 401 });
      }
      throw error;
    }

    if (!event) {
      // An event type this app doesn't act on (e.g. payment_intent.created) — Stripe still expects a 200 or it will retry indefinitely.
      return NextResponse.json({ status: 'IGNORED' }, { status: 200 });
    }

    const db = new DatabaseClient();

    // Idempotency: Stripe may deliver the same event more than once.
    // A prior successful credit for this exact checkout session means
    // this delivery is a duplicate, not a fresh top-up.
    const existing = await db.execute(
      event.tenantId,
      `SELECT id FROM "WalletTransactionRecord" WHERE metadata->>'stripe_session_id' = $1`,
      [event.providerReference]
    );
    if (existing.length > 0) {
      return NextResponse.json({ status: 'ALREADY_PROCESSED' }, { status: 200 });
    }

    const walletRows = await db.execute<WalletRow>(
      event.tenantId,
      `INSERT INTO "TenantWallet" (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
       RETURNING id`,
      [event.tenantId]
    );
    const walletId = walletRows[0].id;

    // Stripe amounts are in the smallest currency unit (e.g. paise);
    // TenantWallet.balance is stored as a decimal in major units.
    const majorUnitsAmount = event.amount / 100;

    await db.execute(
      event.tenantId,
      `UPDATE "TenantWallet" SET balance = balance + $1, updated_at = now() WHERE id = $2`,
      [majorUnitsAmount, walletId]
    );

    await db.execute(
      event.tenantId,
      `INSERT INTO "WalletTransactionRecord" (wallet_id, tenant_id, amount, type, metadata)
       VALUES ($1, $2, $3, 'CREDIT', $4)`,
      [walletId, event.tenantId, majorUnitsAmount, { stripe_session_id: event.providerReference, currency: event.currency }]
    );

    return NextResponse.json({ status: 'CREDITED' }, { status: 200 });
  } catch (error) {
    if (error instanceof PaymentProviderNotConfiguredError) {
      return NextResponse.json({ error: 'PAYMENT_PROVIDER_NOT_CONFIGURED' }, { status: 503 });
    }
    console.error('[BILLING_API] POST /api/billing/webhook failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
