import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent, calculateTotalWithFees } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { CreatePaymentInput } from '@/lib/types/firestore';
import { withApi } from '@/lib/withApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {

    const body = await req.json();
    const { cartItems, shippingAddress, taxRate = 0.08 } = body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart items are required' }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      const listing = await firestoreServices.listings.getListing(cartItem.listingId);
      if (!listing) {
        return NextResponse.json({ error: `Listing ${cartItem.listingId} not found` }, { status: 404 });
      }

      if (!listing.isActive || listing.inventory < cartItem.qty) {
        return NextResponse.json({ 
          error: `Listing ${listing.title} is not available or insufficient inventory` 
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
    const { fees, total } = calculateTotalWithFees(subtotal, tax);

    // Create payment intent with application fee for Stripe Connect
    // Note: For Connect, we'll use transfers instead of application fees for simplicity
    const paymentResult = await createPaymentIntent(total, 'usd', {
      userId: req.userId,
      orderType: 'marketplace',
      orderId: '', // Will be set after order creation
    });

    if (!paymentResult.success) {
      return NextResponse.json({ error: paymentResult.error }, { status: 500 });
    }

    // Create order in database
    const orderData = {
      buyerId: req.userId,
      items: orderItems,
      subtotal,
      fees,
      tax,
      total,
      currency: 'USD',
      paymentIntentId: paymentResult.paymentIntentId!,
      shippingAddress,
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

    // Create payment record
    const paymentData: CreatePaymentInput = {
      orderId,
      userId: req.userId, // Track which user made the payment
      amount: total,
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
      total,
      fees,
      tax,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
});
