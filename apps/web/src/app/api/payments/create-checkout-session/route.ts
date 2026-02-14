import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, calculateTotalWithFees } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { withApi } from '@/lib/withApi';
import { assertStripeAndSendGridConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    assertStripeAndSendGridConfig();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Config validation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { cartItems, shippingAddress, selectedShipping, taxRate = 0.08 } = body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart items are required' }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
    }

    let subtotal = 0;
    const orderItems: Array<{ listingId: string; title: string; qty: number; unitPrice: number; sellerId: string }> = [];

    for (const cartItem of cartItems) {
      const listing = await firestoreServices.listings.getListing(cartItem.listingId);
      if (!listing) {
        return NextResponse.json({ error: `Listing ${cartItem.listingId} not found` }, { status: 404 });
      }
      if (!listing.isActive || listing.inventory < cartItem.qty) {
        return NextResponse.json({
          error: `Listing ${listing.title} is not available or insufficient inventory`,
        }, { status: 400 });
      }
      const itemTotal = cartItem.priceAtAdd * cartItem.qty;
      subtotal += itemTotal;
      orderItems.push({
        listingId: cartItem.listingId,
        title: listing.title,
        qty: cartItem.qty,
        unitPrice: cartItem.priceAtAdd,
        sellerId: cartItem.sellerId,
      });
    }

    const tax = subtotal * taxRate;
    const shippingCost = selectedShipping?.price || 0;
    const { fees, total } = calculateTotalWithFees(subtotal + shippingCost, tax);

    const orderData: Record<string, unknown> = {
      buyerId: req.userId,
      items: orderItems,
      subtotal,
      fees,
      tax,
      total,
      currency: 'USD',
      shippingAddress,
    };

    if (selectedShipping) {
      (orderData as any).shipping = {
        carrier: selectedShipping.carrier,
        serviceName: selectedShipping.serviceName,
        price: selectedShipping.price,
        rateId: selectedShipping.rateId,
        shipmentId: selectedShipping.shipmentId,
      };
    }

    const orderId = await firestoreServices.orders.createOrder(orderData as any);

    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;
    const cancelUrl = `${baseUrl}/cart`;

    const result = await createCheckoutSession({
      amountTotalCents: Math.round(total * 100),
      orderId,
      successUrl,
      cancelUrl,
      description: `Order #${orderId.slice(0, 8)}`,
    });

    if (!result.success || !result.url) {
      return NextResponse.json(
        { error: result.error || 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      sessionId: result.sessionId,
      orderId,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
});
