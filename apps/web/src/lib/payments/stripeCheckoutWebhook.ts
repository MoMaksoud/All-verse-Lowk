import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { verifyWebhookSignature, transferToSeller, calculateSellerPayout, PLATFORM_SERVICE_FEE_PERCENT, stripe } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { ProfileService } from '@/lib/firestore';
import { sendOrderConfirmationEmail, sendSellerNotificationEmail } from '@/lib/email';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { logEmail } from '@/lib/emailLog';
import { assertStripeAndSendGridConfig } from '@/lib/config';

const WEBHOOK_LOCK_TTL_MS = 5 * 60 * 1000;

function getPaymentIntentId(session: Stripe.Checkout.Session): string | undefined {
  if (typeof session.payment_intent === 'string') {
    return session.payment_intent;
  }

  if (session.payment_intent && typeof session.payment_intent === 'object') {
    return session.payment_intent.id;
  }

  return undefined;
}

async function acquireEventLock(eventId: string, eventType: string) {
  const adminDb = getAdminFirestore();
  const eventRef = adminDb.collection('stripe_webhook_events').doc(eventId);

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(eventRef);
    const existing = snap.data() as
      | {
          processed?: boolean;
          processing?: boolean;
          processingStartedAt?: number;
        }
      | undefined;

    const now = Date.now();
    const processingStartedAt = existing?.processingStartedAt ?? 0;
    const processingIsFresh = now - processingStartedAt < WEBHOOK_LOCK_TTL_MS;

    if (existing?.processed === true) {
      return 'processed' as const;
    }

    if (existing?.processing === true && processingIsFresh) {
      return 'processing' as const;
    }

    tx.set(
      eventRef,
      {
        eventId,
        type: eventType,
        processed: false,
        processing: true,
        processingStartedAt: now,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: snap.exists ? snap.get('createdAt') ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return 'acquired' as const;
  });

  return { eventRef, result };
}

async function markEventCompleted(eventRef: FirebaseFirestore.DocumentReference, orderId: string) {
  await eventRef.set(
    {
      processed: true,
      processing: false,
      processingStartedAt: FieldValue.delete(),
      orderId,
      updatedAt: FieldValue.serverTimestamp(),
      lastError: FieldValue.delete(),
    },
    { merge: true }
  );
}

async function markEventFailed(eventRef: FirebaseFirestore.DocumentReference, error: unknown) {
  await eventRef.set(
    {
      processed: false,
      processing: false,
      processingStartedAt: FieldValue.delete(),
      lastError: error instanceof Error ? error.message : String(error),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function markOrderPaid(orderId: string, paymentIntentId: string | undefined, checkoutSessionId: string) {
  const updates: Record<string, unknown> = {
    status: 'paid',
    paidAt: serverTimestamp() as any,
    checkoutSessionId,
  };

  if (paymentIntentId) {
    updates.paymentIntentId = paymentIntentId;
  }

  await firestoreServices.orders.updateOrder(orderId, updates as any);

  const payments = await firestoreServices.payments.getPaymentsByOrder(orderId);
  if (payments.length === 0) {
    return;
  }

  await Promise.all(
    payments
      .filter((payment) => payment.status !== 'succeeded')
      .map((payment) => firestoreServices.payments.updatePayment((payment as any).id, { status: 'succeeded' }))
  );
}

async function ensurePaymentRecord(params: {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  stripeReference: string;
}) {
  const existingPayments = await firestoreServices.payments.getPaymentsByOrder(params.orderId);
  if (existingPayments.length > 0) {
    await Promise.all(
      existingPayments
        .filter((payment) => payment.status !== 'succeeded')
        .map((payment) => firestoreServices.payments.updatePayment((payment as any).id, { status: 'succeeded' }))
    );
    return;
  }

  await firestoreServices.payments.createPayment({
    orderId: params.orderId,
    userId: params.userId,
    amount: params.amount,
    currency: params.currency,
    stripeEventId: params.stripeReference,
    status: 'succeeded',
  });
}

async function processOrderEmails(params: {
  orderId: string;
  sessionId: string;
  order: Awaited<ReturnType<typeof firestoreServices.orders.getOrder>>;
}) {
  const order = params.order;
  if (!order) {
    return;
  }

  if (order.emailSent === true) {
    return;
  }

  const auth = getAdminAuth();
  const buyerProfile = await ProfileService.getProfile(order.buyerId);
  const buyerUser = auth ? await auth.getUser(order.buyerId) : null;
  const buyerEmail = buyerUser?.email;
  let allEmailsOk = true;

  if (buyerEmail && buyerProfile) {
    try {
      const buyerResult = await sendOrderConfirmationEmail({
        orderId: params.orderId,
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
        stripeReference: params.sessionId,
      });

      await logEmail(
        'order_confirmation',
        buyerEmail,
        buyerResult.success ? 'success' : 'failed',
        { orderId: params.orderId, error: buyerResult.error }
      );

      if (!buyerResult.success) {
        allEmailsOk = false;
      }
    } catch (error) {
      allEmailsOk = false;
      await logEmail('order_confirmation', buyerEmail, 'failed', {
        orderId: params.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const item of order.items) {
    const sellerProfile = await ProfileService.getProfile(item.sellerId);
    if (!sellerProfile) {
      continue;
    }

    const sellerUser = auth ? await auth.getUser(item.sellerId) : null;
    const sellerEmail = sellerUser?.email;
    if (!sellerEmail) {
      continue;
    }

    try {
      const itemTotal = item.unitPrice * item.qty;
      const sellerResult = await sendSellerNotificationEmail({
        sellerName: sellerProfile.displayName || 'Seller',
        sellerEmail,
        buyerName: buyerProfile?.displayName || 'Customer',
        itemTitle: item.title,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        total: itemTotal,
        orderId: params.orderId,
        stripeReference: params.sessionId,
      });

      await logEmail(
        'seller_notification',
        sellerEmail,
        sellerResult.success ? 'success' : 'failed',
        { orderId: params.orderId, error: sellerResult.error }
      );

      if (!sellerResult.success) {
        allEmailsOk = false;
      }
    } catch (error) {
      allEmailsOk = false;
      await logEmail('seller_notification', sellerEmail, 'failed', {
        orderId: params.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (allEmailsOk) {
    await firestoreServices.orders.updateOrder(params.orderId, {
      emailSent: true,
      emailSentAt: serverTimestamp() as any,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    assertStripeAndSendGridConfig();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Config validation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let eventRef: FirebaseFirestore.DocumentReference | null = null;

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
    if (!verification.success || !verification.event) {
      return NextResponse.json({ error: verification.error || 'Invalid event' }, { status: 400 });
    }

    const event = verification.event;
    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const lock = await acquireEventLock(event.id, event.type);
    eventRef = lock.eventRef;

    if (lock.result === 'processed') {
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
    }

    if (lock.result === 'processing') {
      return NextResponse.json({ received: true, processing: true }, { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: [] });
    const orderId = typeof fullSession.metadata?.orderId === 'string' ? fullSession.metadata.orderId.trim() : '';

    if (!orderId) {
      throw new Error('Missing session.metadata.orderId');
    }

    let order = await firestoreServices.orders.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found for orderId ${orderId}`);
    }

    const paymentIntentId = getPaymentIntentId(fullSession);
    await markOrderPaid(orderId, paymentIntentId, fullSession.id);
    await ensurePaymentRecord({
      orderId,
      userId: order.buyerId,
      amount: order.total,
      currency: order.currency,
      stripeReference: paymentIntentId || fullSession.id,
    });

    order = await firestoreServices.orders.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found after payment update for ${orderId}`);
    }

    if (order.inventoryAdjusted !== true) {
      for (const item of order.items) {
        await firestoreServices.listings.updateInventory(item.listingId, item.qty);
      }

      await firestoreServices.orders.updateOrder(orderId, {
        inventoryAdjusted: true,
        inventoryAdjustedAt: serverTimestamp() as any,
      });
      order.inventoryAdjusted = true;
    }

    if (order.payoutsProcessed !== true) {
      for (const item of order.items) {
        const itemTotal = item.unitPrice * item.qty;
        const { sellerPayout } = calculateSellerPayout(itemTotal, PLATFORM_SERVICE_FEE_PERCENT);
        const sellerProfile = await ProfileService.getProfile(item.sellerId);

        if (sellerProfile?.stripeConnectAccountId && sellerProfile?.stripeConnectOnboardingComplete) {
          await transferToSeller(sellerProfile.stripeConnectAccountId, sellerPayout, orderId);
        }
      }

      await firestoreServices.orders.updateOrder(orderId, {
        payoutsProcessed: true,
        payoutsProcessedAt: serverTimestamp() as any,
      });
      order.payoutsProcessed = true;
    }

    if (order.cartCleared !== true) {
      await firestoreServices.carts.clearCart(order.buyerId);
      await firestoreServices.orders.updateOrder(orderId, {
        cartCleared: true,
        cartClearedAt: serverTimestamp() as any,
      });
      order.cartCleared = true;
    }

    await processOrderEmails({
      orderId,
      sessionId: fullSession.id,
      order,
    });

    await markEventCompleted(eventRef, orderId);
    return NextResponse.json({ received: true, orderId }, { status: 200 });
  } catch (error) {
    if (eventRef) {
      await markEventFailed(eventRef, error);
    }

    console.error('[stripe/webhook] Fatal error', error);
    return new Response('Webhook error', { status: 500 });
  }
}
