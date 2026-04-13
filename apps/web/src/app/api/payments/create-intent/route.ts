import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { CreatePaymentInput } from '@/lib/types/firestore';
import { withApi } from '@/lib/withApi';
import { prepareTrustedCheckout } from '@/lib/payments/checkout';
import { DEFAULT_TAX_RATE } from '@/lib/payments/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const body = await req.json();
    const { cartItems, shippingAddress, selectedShipping } = body;
    const checkout = await prepareTrustedCheckout({
      cartItems,
      shippingAddress,
      selectedShipping,
      taxRate: DEFAULT_TAX_RATE,
    });

    // Prepare metadata for payment intent
    const metadata: Record<string, string> = {
      userId: req.userId,
      orderType: 'marketplace',
      orderId: '', // Will be set after order creation
    };

    // Add shipping metadata if selected
    metadata.shippingCarrier = checkout.shippingRate.carrier;
    metadata.shippingService = checkout.shippingRate.serviceName;
    metadata.shippingPrice = checkout.shippingRate.price.toString();
    metadata.shippingRateId = checkout.shippingRate.rateId;
    metadata.shippingShipmentId = checkout.shippingRate.shipmentId;

    // Create payment intent with application fee for Stripe Connect
    // Note: For Connect, we'll use transfers instead of application fees for simplicity
    const paymentResult = await createPaymentIntent(checkout.total, 'usd', metadata);

    if (!paymentResult.success) {
      return NextResponse.json({ error: paymentResult.error }, { status: 500 });
    }

    // Create order in database
    const orderData: any = {
      buyerId: req.userId,
      items: checkout.orderItems,
      subtotal: checkout.subtotal,
      fees: checkout.fees,
      tax: checkout.tax,
      total: checkout.total,
      currency: 'USD',
      paymentIntentId: paymentResult.paymentIntentId!,
      shippingAddress: checkout.shippingAddress,
      shipping: checkout.shippingRate,
    };

    const orderId = await firestoreServices.orders.createOrder(orderData);

    // Update payment intent metadata with orderId
    if (paymentResult.paymentIntentId) {
      try {
        const { stripe } = await import('@/lib/stripe');
        await stripe.paymentIntents.update(paymentResult.paymentIntentId, {
          metadata: {
            ...paymentResult.paymentIntent?.metadata,
            orderId,
          },
        });
      } catch (error) {
        console.error('Error updating payment intent metadata:', error);
        // Non-critical, continue
      }
    }

    // Shipping info is already included in orderData, so no need to update again

    // Create payment record
    const paymentData: CreatePaymentInput = {
      orderId,
      userId: req.userId, // Track which user made the payment
      amount: checkout.total,
      currency: 'USD',
      stripeEventId: paymentResult.paymentIntentId!,
      status: 'pending',
    };

    await firestoreServices.payments.createPayment(paymentData);

    return NextResponse.json({
      success: true,
      clientSecret: paymentResult.clientSecret,
      orderId,
      paymentIntentId: paymentResult.paymentIntentId,
      total: checkout.total,
      fees: checkout.fees,
      tax: checkout.tax,
      shipping: checkout.shippingRate.price,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
});
