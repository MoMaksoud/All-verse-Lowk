import { NextRequest, NextResponse } from 'next/server';
import { retrievePaymentIntent } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const body = await req.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400 });
    }

    // Retrieve payment intent from Stripe
    const paymentResult = await retrievePaymentIntent(paymentIntentId);
    if (!paymentResult.success) {
      return NextResponse.json({ error: paymentResult.error }, { status: 500 });
    }

    const paymentIntent = paymentResult.paymentIntent;

    // Find the order associated with this payment intent
    const orders = await firestoreServices.orders.getOrdersByBuyer(userId);
    const order = orders.find(o => o.paymentIntentId === paymentIntentId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update payment status
    const paymentStatus = paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed';
    await firestoreServices.payments.updatePayment(paymentIntent.id, {
      status: paymentStatus,
    });

    if (paymentIntent.status === 'succeeded') {
      // Update order status to paid
      await firestoreServices.orders.updateOrder(order.id, {
        status: 'paid',
      });

      // Update inventory for each item
      for (const item of order.items) {
        await firestoreServices.listings.updateInventory(item.listingId, item.qty);
      }

      // Clear user's cart
      await firestoreServices.carts.clearCart(userId);

      return NextResponse.json({
        success: true,
        status: 'succeeded',
        orderId: order.id,
        message: 'Payment successful! Your order has been confirmed.',
      });
    } else {
      // Update order status to cancelled
      await firestoreServices.orders.updateOrder(order.id, {
        status: 'cancelled',
      });

      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        orderId: order.id,
        message: 'Payment failed. Please try again.',
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}
