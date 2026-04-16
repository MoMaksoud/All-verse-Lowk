import { NextRequest } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { withApi } from '@/lib/withApi';
import { assertStripeAndSendGridConfig } from '@/lib/config';
import { prepareTrustedCheckout, getCheckoutBaseUrl } from '@/lib/payments/checkout';
import { DEFAULT_TAX_RATE } from '@/lib/payments/pricing';
import { fail, ok } from '@/lib/api/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    assertStripeAndSendGridConfig();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Config validation failed';
    return fail({ status: 500, code: 'ENV_CONFIG_MISSING', message: msg });
  }

  try {
    const body = await req.json();
    const { shippingAddress, selectedShipping } = body;

    // Source of truth: user's server-side cart, not client-submitted cart payload.
    const userCart = await firestoreServices.carts.getCart(req.userId);
    const cartItems = userCart?.items ?? [];
    if (cartItems.length === 0) {
      return fail({
        status: 400,
        code: 'EMPTY_CART',
        message: 'Your cart is empty. Add items before checkout.',
      });
    }

    const checkout = await prepareTrustedCheckout({
      cartItems,
      shippingAddress,
      selectedShipping,
      taxRate: DEFAULT_TAX_RATE,
    });

    const orderData: Record<string, unknown> = {
      buyerId: req.userId,
      items: checkout.orderItems,
      subtotal: checkout.subtotal,
      fees: checkout.fees,
      tax: checkout.tax,
      total: checkout.total,
      currency: 'USD',
      shippingAddress: checkout.shippingAddress,
      shipping: checkout.shippingRate,
    };

    const orderId = await firestoreServices.orders.createOrder(orderData as any);

    const baseUrl = getCheckoutBaseUrl();
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/cart`;
    
    const result = await createCheckoutSession({
      amountTotalCents: Math.round(checkout.total * 100),
      orderId,
      successUrl,
      cancelUrl,
      description: `Order #${orderId.slice(0, 8)}`,
    });

    if (!result.success || !result.url) {
      return fail({
        status: 500,
        code: 'CHECKOUT_SESSION_CREATE_FAILED',
        message: result.error || 'Failed to create checkout session',
      });
    }

    await firestoreServices.orders.updateOrder(orderId, {
      checkoutSessionId: result.sessionId,
    });

    await firestoreServices.payments.createPayment({
      orderId,
      userId: req.userId,
      amount: checkout.total,
      currency: 'USD',
      stripeEventId: result.sessionId!,
      status: 'pending',
    });

    return ok({
      url: result.url,
      sessionId: result.sessionId,
      orderId,
      total: checkout.total,
      subtotal: checkout.subtotal,
      tax: checkout.tax,
      fees: checkout.fees,
      shipping: checkout.shippingRate.price,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return fail({
      status: error instanceof Error ? 400 : 500,
      code: 'CHECKOUT_VALIDATION_FAILED',
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
});
