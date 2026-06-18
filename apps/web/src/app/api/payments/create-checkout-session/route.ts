import { NextRequest } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { withApi } from '@/lib/withApi';
import { getCartAdmin } from '@/lib/server/adminCarts';
import { createCheckoutSnapshotAdmin } from '@/lib/server/adminCheckoutSnapshots';
import { assertStripeConfig } from '@/lib/config';
import { prepareTrustedCheckout, getCheckoutBaseUrl } from '@/lib/payments/checkout';
import { DEFAULT_TAX_RATE } from '@/lib/payments/pricing';
import { fail, ok } from '@/lib/api/responses';
import { serverLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    assertStripeConfig();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Config validation failed';
    return fail({ status: 500, code: 'ENV_CONFIG_MISSING', message: msg });
  }

  try {
    const body = await req.json();
    const { shippingAddress, selectedShipping } = body;

    // Source of truth: server-side cart, not client payload.
    const userCart = await getCartAdmin(req.userId);
    const cartItems = userCart?.items ?? [];
    if (cartItems.length === 0) {
      return fail({
        status: 400,
        code: 'EMPTY_CART',
        message: 'Your cart is empty. Add items before checkout.',
      });
    }

    // Validate listings + lock pricing + get shipping quote.
    // No order is written to Firestore yet — that happens after payment succeeds.
    const checkout = await prepareTrustedCheckout({
      cartItems,
      shippingAddress,
      selectedShipping,
      taxRate: DEFAULT_TAX_RATE,
    });

    const baseUrl = getCheckoutBaseUrl();
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/cart`;

    const result = await createCheckoutSession({
      amountTotalCents: Math.round(checkout.total * 100),
      buyerId: req.userId,
      successUrl,
      cancelUrl,
      description: 'Marketplace order',
    });

    if (!result.success || !result.url || !result.sessionId) {
      return fail({
        status: 500,
        code: 'CHECKOUT_SESSION_CREATE_FAILED',
        message: result.error || 'Failed to create checkout session',
      });
    }

    // Persist the validated cart snapshot keyed by Stripe session ID.
    // The webhook reads this snapshot and creates the order atomically after payment.
    await createCheckoutSnapshotAdmin(result.sessionId, {
      buyerId: req.userId,
      items: checkout.orderItems,
      subtotal: checkout.subtotal,
      tax: checkout.tax,
      fees: checkout.fees,
      total: checkout.total,
      shippingAddress: checkout.shippingAddress,
      shippingRate: checkout.shippingRate,
      sellerShippingRates: checkout.sellerShippingRates,
      currency: 'USD',
    });

    serverLogger.info('checkout_session_created', {
      route: 'api/payments/create-checkout-session',
      userId: req.userId,
      sessionId: result.sessionId,
      total: checkout.total,
    });

    return ok({
      url: result.url,
      sessionId: result.sessionId,
      total: checkout.total,
      subtotal: checkout.subtotal,
      tax: checkout.tax,
      fees: checkout.fees,
      shipping: checkout.shippingRate.price,
    });
  } catch (error) {
    serverLogger.error('checkout_session_create_failed', {
      route: 'api/payments/create-checkout-session',
      userId: req.userId,
      error: error instanceof Error ? error.message : 'Server error',
    });
    return fail({
      status: error instanceof Error ? 400 : 500,
      code: 'CHECKOUT_VALIDATION_FAILED',
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
});
