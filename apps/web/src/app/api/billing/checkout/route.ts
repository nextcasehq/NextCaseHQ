import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { getPaymentProvider } from '@/lib/billing/payment-provider';
import { PaymentProviderNotConfiguredError, PaymentProviderRequestError } from '@/lib/billing/errors';

const MAX_AMOUNT_MINOR_UNITS = 10_000_000; // sanity cap, not a real product limit

const CheckoutBodySchema = z.object({
  amount: z.number().int().positive().max(MAX_AMOUNT_MINOR_UNITS),
  currency: z
    .string()
    .length(3)
    .optional()
    .default('inr'),
});

/**
 * Creates a real Stripe Checkout Session for topping up the tenant's
 * wallet. The actual balance credit happens in POST /api/billing/webhook
 * once Stripe confirms payment — this route only starts the flow.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Malformed JSON body.' }, { status: 400 });
    }

    const parsed = CheckoutBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid request body.', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutSession = await getPaymentProvider().createCheckoutSession({
      tenantId: session.tenantId,
      amount: parsed.data.amount,
      currency: parsed.data.currency.toLowerCase(),
      successUrl: `${baseUrl}/dashboard?billing=success`,
      cancelUrl: `${baseUrl}/dashboard?billing=cancelled`,
    });

    return NextResponse.json(
      { checkout_url: checkoutSession.url, session_id: checkoutSession.id },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PaymentProviderNotConfiguredError) {
      return NextResponse.json({ error: 'PAYMENT_PROVIDER_NOT_CONFIGURED' }, { status: 503 });
    }
    if (error instanceof PaymentProviderRequestError) {
      return NextResponse.json({ error: 'PAYMENT_PROVIDER_REQUEST_FAILED' }, { status: 502 });
    }
    console.error('[BILLING_API] POST /api/billing/checkout failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
