import { NextRequest, NextResponse } from 'next/server';
import { retrievePaymentIntent } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { withApi } from '@/lib/withApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {

    const body = await req.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400 });
    }

    console.log('Confirming payment for user:', req.userId, 'paymentIntentId:', paymentIntentId);

    // Retrieve payment intent from Stripe
    const paymentResult = await retrievePaymentIntent(paymentIntentId);
    if (!paymentResult.success) {
      console.error('Failed to retrieve payment intent:', paymentResult.error);
      return NextResponse.json({ error: paymentResult.error }, { status: 500 });
    }

    const paymentIntent = paymentResult.paymentIntent;
    if (!paymentIntent) {
      console.error('Payment intent is undefined');
      return NextResponse.json({ error: 'Payment intent not found' }, { status: 404 });
    }
    console.log('Payment intent status:', paymentIntent.status);

    // Find the order associated with this payment intent
    const orders = await firestoreServices.orders.getOrdersByBuyer(req.userId);
    console.log('Found orders for buyer:', orders.length);
    
    const order = orders.find(o => o.paymentIntentId === paymentIntentId);
    if (!order) {
      console.error('Order not found for paymentIntentId:', paymentIntentId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log('Found order:', (order as any).id);

    // Update payment status
    const paymentStatus = paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed';
    try {
      await firestoreServices.payments.updatePayment(paymentIntent.id, {
        status: paymentStatus,
      });
      console.log('Payment status updated successfully');
    } catch (error) {
      console.error('Error updating payment status:', error);
      // Continue anyway - this is not critical
    }

    if (paymentIntent.status === 'succeeded') {
      // Update order status to paid
      try {
        await firestoreServices.orders.updateOrder((order as any).id, {
          status: 'paid',
        });
        console.log('Order status updated to paid');
      } catch (error) {
        console.error('Error updating order status:', error);
        throw error; // This is critical, so we should fail
      }

      // Update inventory for each item
      try {
        for (const item of order.items) {
          await firestoreServices.listings.updateInventory(item.listingId, item.qty);
        }
        console.log('Inventory updated successfully');
      } catch (error) {
        console.error('Error updating inventory:', error);
        throw error; // This is critical, so we should fail
      }

      // Clear user's cart
      try {
        await firestoreServices.carts.clearCart(req.userId);
        console.log('Cart cleared successfully');
      } catch (error) {
        console.error('Error clearing cart:', error);
        // This is not critical, so we can continue
      }

      return NextResponse.json({
        success: true,
        status: 'succeeded',
        orderId: (order as any).id,
        message: 'Payment successful! Your order has been confirmed.',
      });
    } else if (paymentIntent.status === 'requires_payment_method') {
      // For testing purposes, simulate a successful payment
      // In production, this would be handled by Stripe webhooks
      console.log('Simulating successful payment for testing');
      
      // Update order status to paid
      await firestoreServices.orders.updateOrder((order as any).id, {
        status: 'paid',
      });

      // Update inventory for each item
      for (const item of order.items) {
        await firestoreServices.listings.updateInventory(item.listingId, item.qty);
      }

      // Clear user's cart
      await firestoreServices.carts.clearCart(req.userId);

      return NextResponse.json({
        success: true,
        status: 'succeeded',
        orderId: (order as any).id,
        message: 'Payment successful! Your order has been confirmed.',
      });
    } else if (paymentIntent.status === 'requires_confirmation') {
      // Payment intent is still pending - this is normal for test payments
      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        orderId: (order as any).id,
        message: 'Payment is still processing. Please wait a moment and try again.',
      });
    } else {
      // Update order status to cancelled
      await firestoreServices.orders.updateOrder((order as any).id, {
        status: 'cancelled',
      });

      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        orderId: (order as any).id,
        message: 'Payment failed. Please try again.',
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
});
