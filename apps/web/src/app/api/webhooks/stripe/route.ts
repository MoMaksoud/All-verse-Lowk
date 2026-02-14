import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { serverTimestamp } from 'firebase/firestore';
import { verifyWebhookSignature, transferToSeller, calculateSellerPayout, PLATFORM_SERVICE_FEE_PERCENT } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { ProfileService } from '@/lib/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { sendOrderConfirmationEmail, sendSellerNotificationEmail } from '@/lib/email';
import { getAdminAuth } from '@/lib/firebase-admin';
import { logEmail } from '@/lib/emailLog';
import { assertStripeAndSendGridConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    assertStripeAndSendGridConfig();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Config validation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

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

    const verification = verifyWebhookSignature(payload, signature, webhookSecret);
    if (!verification.success) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    const event = verification.event;
    if (!event) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = typeof session.metadata?.orderId === 'string' ? session.metadata.orderId.trim() : null;

    if (!orderId) {
      console.error('[webhook] checkout.session.completed: missing or invalid session.metadata.orderId');
      return NextResponse.json(
        { error: 'Missing session.metadata.orderId' },
        { status: 400 }
      );
    }

    if (!db || !isFirebaseConfigured()) {
      console.error('[webhook] Database not initialized or Firebase not configured');
      return new Response('Webhook error', { status: 500 });
    }

    const order = await firestoreServices.orders.getOrder(orderId);
    if (!order) {
      console.error('[webhook] checkout.session.completed: order not found for orderId', orderId);
      return new Response('Webhook error', { status: 500 });
    }

    if (order.status === 'paid'  && order.emailSent === true) {
      return NextResponse.json({ received: true });
    }

    try {
      await firestoreServices.orders.updateOrder(orderId, {
        status: 'paid',
        paidAt: serverTimestamp() as any,
      });
    } catch (err) {
      console.error('[webhook] Critical: failed to mark order paid', err);
      return new Response('Webhook error', { status: 500 });
    }

    try {
      for (const item of order.items) {
        await firestoreServices.listings.updateInventory(item.listingId, item.qty);
      }
    } catch (err) {
      console.error('[webhook] Critical: failed to update inventory', err);
      return new Response('Webhook error', { status: 500 });
    }

    try {
      for (const item of order.items) {
        const itemTotal = item.unitPrice * item.qty;
        const { sellerPayout } = calculateSellerPayout(itemTotal, PLATFORM_SERVICE_FEE_PERCENT);
        const sellerProfile = await ProfileService.getProfile(item.sellerId);
        if (sellerProfile?.stripeConnectAccountId && sellerProfile?.stripeConnectOnboardingComplete) {
          await transferToSeller(sellerProfile.stripeConnectAccountId, sellerPayout, orderId);
        }
      }
    } catch (err) {
      console.error('[webhook] Critical: failed to transfer to seller(s)', err);
      return new Response('Webhook error', { status: 500 });
    }

    try {
      await firestoreServices.carts.clearCart(order.buyerId);
    } catch (err) {
      console.error('[webhook] Critical: failed to clear cart', err);
      return new Response('Webhook error', { status: 500 });
    }

    const auth = getAdminAuth();
    const buyerProfile = await ProfileService.getProfile(order.buyerId);
    const buyerUser = auth ? await auth.getUser(order.buyerId) : null;
    const buyerEmail = buyerUser?.email;
    let allEmailsOk = true;

    if (buyerEmail && buyerProfile) {
      try {
        const result = await sendOrderConfirmationEmail({
          orderId,
          buyerName: buyerProfile.displayName || 'Customer',
          buyerEmail,
          items: order.items.map((item) => ({
            title: item.title,
            qty: item.qty,
            unitPrice: item.unitPrice,
          })),
          subtotal: order.subtotal,
          tax: order.tax,
          fees: order.fees,
          total: order.total,
          shippingAddress: order.shippingAddress,
        });
        if (result.success) {
          await logEmail('order_confirmation', buyerEmail, 'success', { orderId });
        } else {
          allEmailsOk = false;
          await logEmail('order_confirmation', buyerEmail, 'failed', { orderId, error: result.error });
        }
      } catch (err) {
        allEmailsOk = false;
        const error = err instanceof Error ? err.message : String(err);
        await logEmail('order_confirmation', buyerEmail, 'failed', { orderId, error });
      }
    }

    for (const item of order.items) {
      const sellerProfile = await ProfileService.getProfile(item.sellerId);
      if (!sellerProfile) continue;
      const sellerUser = auth ? await auth.getUser(item.sellerId) : null;
      const sellerEmail = sellerUser?.email;
      if (!sellerEmail) continue;

      try {
        const itemTotal = item.unitPrice * item.qty;
        const result = await sendSellerNotificationEmail({
          sellerName: sellerProfile.displayName || 'Seller',
          sellerEmail,
          buyerName: buyerProfile?.displayName || 'Customer',
          itemTitle: item.title,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          total: itemTotal,
          orderId,
        });
        if (result.success) {
          await logEmail('seller_notification', sellerEmail, 'success', { orderId });
        } else {
          allEmailsOk = false;
          await logEmail('seller_notification', sellerEmail, 'failed', { orderId, error: result.error });
        }
      } catch (err) {
        allEmailsOk = false;
        const error = err instanceof Error ? err.message : String(err);
        await logEmail('seller_notification', sellerEmail, 'failed', { orderId, error });
      }
    }

    if (allEmailsOk) {
      try {
        await firestoreServices.orders.updateOrder(orderId, {
          emailSent: true,
          emailSentAt: serverTimestamp() as any,
        });
      } catch {
        // non-critical: already logged above
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Fatal error', error);
    return new Response('Webhook error', { status: 500 });
  }
}
