import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';

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
    console.log('Payment succeeded:', paymentIntent.id);
    
    // Find payment record
    const payments = await firestoreServices.payments.getPaymentsByStatus('pending');
    const payment = payments.find(p => p.stripeEventId === paymentIntent.id);
    
    if (payment) {
      // Update payment status
      await firestoreServices.payments.updatePayment((payment as any).id, {
        status: 'succeeded',
      });

      // Update order status
      const order = await firestoreServices.orders.getOrder(payment.orderId);
      if (order) {
        await firestoreServices.orders.updateOrder((order as any).id, {
          status: 'paid',
        });
      }
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
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
