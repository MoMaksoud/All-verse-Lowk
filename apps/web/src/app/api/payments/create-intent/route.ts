import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent, calculateTotalWithFees } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { CreatePaymentInput } from '@/lib/types/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

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

    // Create payment intent
    const paymentResult = await createPaymentIntent(total, 'usd', {
      userId,
      orderType: 'marketplace',
    });

    if (!paymentResult.success) {
      return NextResponse.json({ error: paymentResult.error }, { status: 500 });
    }

    // Create order in database
    const orderData = {
      buyerId: userId,
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

    // Create payment record
    const paymentData: CreatePaymentInput = {
      orderId,
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
}
