import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, transferToSeller, calculateSellerPayout } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { ProfileService } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify webhook signature
    const verification = verifyWebhookSignature(payload, signature, webhookSecret);
    if (!verification.success) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const event = verification.event;
    if (!event) {
      console.error('Event is undefined');
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  try {
    console.log('✅ Payment succeeded:', paymentIntent.id);
    
    // Find payment record
    const payments = await firestoreServices.payments.getPaymentsByStatus('pending');
    const payment = payments.find(p => p.stripeEventId === paymentIntent.id);
    
    if (!payment) {
      console.warn('Payment record not found for payment intent:', paymentIntent.id);
      return;
    }

    // Update payment status
    await firestoreServices.payments.updatePayment((payment as any).id, {
      status: 'succeeded',
    });
    console.log('✅ Payment status updated to succeeded');

    // Get the order
    const order = await firestoreServices.orders.getOrder(payment.orderId);
    if (!order) {
      console.error('Order not found:', payment.orderId);
      return;
    }

    // Update order status
    await firestoreServices.orders.updateOrder((order as any).id, {
      status: 'paid',
    });
    console.log('✅ Order status updated to paid');

    // Update inventory and mark listings as inactive if sold out
    for (const item of order.items) {
      try {
        // This will automatically set isActive: false if inventory reaches 0
        await firestoreServices.listings.updateInventory(item.listingId, item.qty);
        console.log(`✅ Updated inventory for listing ${item.listingId}`);

        // Calculate seller payout (after platform fee)
        const itemTotal = item.unitPrice * item.qty;
        const { sellerPayout, platformFee } = calculateSellerPayout(itemTotal, 10); // 10% platform fee

        // Transfer funds to seller's Stripe Connect account
        try {
          const sellerProfile = await ProfileService.getProfile(item.sellerId);
          if (sellerProfile?.stripeConnectAccountId && sellerProfile?.stripeConnectOnboardingComplete) {
            const transferResult = await transferToSeller(
              sellerProfile.stripeConnectAccountId,
              sellerPayout,
              (order as any).id
            );
            
            if (transferResult.success) {
              console.log(`✅ Transferred $${sellerPayout.toFixed(2)} to seller ${item.sellerId}`);
            } else {
              console.error(`❌ Failed to transfer to seller ${item.sellerId}:`, transferResult.error);
            }
          } else {
            console.warn(`⚠️ Seller ${item.sellerId} doesn't have a connected Stripe account. Payout will be pending.`);
            // TODO: Store pending payout in database for later processing
          }
        } catch (transferError) {
          console.error(`❌ Error transferring to seller ${item.sellerId}:`, transferError);
          // Continue even if transfer fails - we can retry later
        }

        // Create notifications
        // Buyer notification
        await addDoc(collection(db, 'users', order.buyerId, 'notifications'), {
          type: 'order_confirmed',
          orderId: (order as any).id,
          listingId: item.listingId,
          title: 'Order Confirmed',
          message: `Your order for ${item.title} has been confirmed!`,
          createdAt: serverTimestamp(),
          seen: false,
        });

        // Seller notification
        await addDoc(collection(db, 'users', item.sellerId, 'notifications'), {
          type: 'item_sold',
          orderId: (order as any).id,
          listingId: item.listingId,
          title: 'Item Sold',
          message: `Your item "${item.title}" has been sold! $${sellerPayout.toFixed(2)} will be transferred to your account.`,
          createdAt: serverTimestamp(),
          seen: false,
        });

        console.log(`✅ Notifications created for buyer and seller`);
      } catch (error) {
        console.error(`❌ Error updating inventory/notifications for listing ${item.listingId}:`, error);
        // Continue with other items even if one fails
      }
    }

    // Clear buyer's cart
    try {
      await firestoreServices.carts.clearCart(order.buyerId);
      console.log('✅ Cart cleared for buyer');
    } catch (error) {
      console.error('❌ Error clearing cart:', error);
      // Not critical, continue
    }

    console.log('✅ Payment processing complete for order:', (order as any).id);
  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  try {
    console.log('Payment failed:', paymentIntent.id);
    
    // Find payment record
    const payments = await firestoreServices.payments.getPaymentsByStatus('pending');
    const payment = payments.find(p => p.stripeEventId === paymentIntent.id);
    
    if (payment) {
      // Update payment status
      await firestoreServices.payments.updatePayment((payment as any).id, {
        status: 'failed',
      });

      // Update order status
      const order = await firestoreServices.orders.getOrder(payment.orderId);
      if (order) {
        await firestoreServices.orders.updateOrder((order as any).id, {
          status: 'cancelled',
        });
      }
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handlePaymentCanceled(paymentIntent: any) {
  try {
    console.log('Payment canceled:', paymentIntent.id);
    
    // Find payment record
    const payments = await firestoreServices.payments.getPaymentsByStatus('pending');
    const payment = payments.find(p => p.stripeEventId === paymentIntent.id);
    
    if (payment) {
      // Update payment status
      await firestoreServices.payments.updatePayment((payment as any).id, {
        status: 'failed',
      });

      // Update order status
      const order = await firestoreServices.orders.getOrder(payment.orderId);
      if (order) {
        await firestoreServices.orders.updateOrder((order as any).id, {
          status: 'cancelled',
        });
      }
    }
  } catch (error) {
    console.error('Error handling payment canceled:', error);
  }
}
