import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { verifyWebhookSignature, transferToSeller, calculateSellerPayout, PLATFORM_SERVICE_FEE_PERCENT, stripe } from '@/lib/stripe';
import { sendOrderConfirmationEmail, sendSellerNotificationEmail } from '@/lib/email';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { logEmail } from '@/lib/emailLog';
import { assertStripeAndSendGridConfig } from '@/lib/config';
import { canTransitionOrderStatus } from '@/lib/authz';
import { getOrderAdmin, updateOrderAdmin } from '@/lib/server/adminOrders';
import {
  createPaymentAdmin,
  getPaymentsByOrderAdmin,
  updatePaymentAdmin,
} from '@/lib/server/adminPayments';
import { clearCartAdmin } from '@/lib/server/adminCarts';
import { updateInventoryAdmin } from '@/lib/server/adminListings';
import { getProfileDocumentAdmin } from '@/lib/server/adminProfiles';
import type { FirestoreOrder, PayoutTransferRecord } from '@/lib/types/firestore';
import { serverLogger } from '@/lib/server/logger';

const WEBHOOK_LOCK_TTL_MS = 5 * 60 * 1000;

function getAppBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://allversegpt.com';
}

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
  const current = await getOrderAdmin(orderId);
  if (!current) {
    throw new Error(`Order ${orderId} not found before paid transition`);
  }
  if (current.status === 'cancelled') {
    throw new Error(`Cannot mark cancelled order ${orderId} as paid`);
  }

  const alreadySettled = current.status === 'paid' || current.status === 'shipped' || current.status === 'delivered';
  if (!alreadySettled) {
    const canSystemMarkPaid = canTransitionOrderStatus(current.status, 'paid', 'system');
    if (!canSystemMarkPaid) {
      throw new Error(`Invalid system transition ${current.status} -> paid for ${orderId}`);
    }
  }

  const updates: Record<string, unknown> = {
    checkoutSessionId,
  };
  if (!alreadySettled) {
    updates.status = 'paid';
    updates.paidAt = FieldValue.serverTimestamp();
  }

  if (paymentIntentId) {
    updates.paymentIntentId = paymentIntentId;
  }

  await updateOrderAdmin(orderId, updates);

  const payments = await getPaymentsByOrderAdmin(orderId);
  if (payments.length === 0) {
    return;
  }

  await Promise.all(
    payments
      .filter((payment) => payment.status !== 'succeeded')
      .map((payment) => updatePaymentAdmin(payment.id, { status: 'succeeded' }))
  );
}

async function markOrderCancelled(orderId: string, checkoutSessionId: string) {
  const order = await getOrderAdmin(orderId);
  if (!order) {
    return;
  }
  if (order.status === 'cancelled') {
    return;
  }
  const canSystemCancel = canTransitionOrderStatus(order.status, 'cancelled', 'system');
  if (!canSystemCancel) {
    return;
  }

  await updateOrderAdmin(orderId, {
    status: 'cancelled',
    checkoutSessionId,
  });

  const payments = await getPaymentsByOrderAdmin(orderId);
  if (payments.length === 0) {
    return;
  }

  await Promise.all(
    payments
      .filter((payment) => payment.status === 'pending')
      .map((payment) => updatePaymentAdmin(payment.id, { status: 'failed' }))
  );
}

function assertSessionMatchesOrder(session: Stripe.Checkout.Session, order: (FirestoreOrder & { id: string }) | null) {
  if (!order) {
    throw new Error('Order missing for reconciliation');
  }

  if (session.payment_status !== 'paid') {
    throw new Error(`Checkout session ${session.id} is not paid (status: ${session.payment_status})`);
  }

  if (typeof session.client_reference_id === 'string' && session.client_reference_id.trim()) {
    if (order.id && session.client_reference_id.trim() !== order.id) {
      throw new Error(
        `Checkout reference mismatch for ${session.id}: expected ${order.id}, got ${session.client_reference_id}`
      );
    }
  }

  if (typeof session.amount_total === 'number') {
    const expectedAmountCents = Math.round(order.total * 100);
    if (session.amount_total !== expectedAmountCents) {
      throw new Error(
        `Checkout amount mismatch for ${session.id}: expected ${expectedAmountCents}, got ${session.amount_total}`
      );
    }
  }

  if (typeof session.currency === 'string' && session.currency.toLowerCase() !== order.currency.toLowerCase()) {
    throw new Error(
      `Checkout currency mismatch for ${session.id}: expected ${order.currency}, got ${session.currency}`
    );
  }
}

async function ensurePaymentRecord(params: {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  stripeReference: string;
}) {
  const existingPayments = await getPaymentsByOrderAdmin(params.orderId);
  if (existingPayments.length > 0) {
    await Promise.all(
      existingPayments
        .filter((payment) => payment.status !== 'succeeded')
        .map((payment) => updatePaymentAdmin(payment.id, { status: 'succeeded' }))
    );
    return;
  }

  await createPaymentAdmin({
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
  order: FirestoreOrder | null;
}) {
  const order = params.order;
  if (!order) {
    return;
  }

  if (order.emailSent === true) {
    return;
  }

  const auth = getAdminAuth();
  const buyerProfile = await getProfileDocumentAdmin(order.buyerId);
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
    const sellerProfile = await getProfileDocumentAdmin(item.sellerId);
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
        sellerOrdersUrl: `${getAppBaseUrl()}/sales`,
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
    await updateOrderAdmin(params.orderId, {
      emailSent: true,
      emailSentAt: FieldValue.serverTimestamp(),
    });
  }
}

type PayoutFailureRecord = { sellerId: string; error: string; listingId: string };
type PayoutTransferWrite = Omit<PayoutTransferRecord, 'at'> & { at: unknown };
type PayoutTransferAttempt = {
  failures: PayoutFailureRecord[];
  successes: PayoutTransferWrite[];
};

/**
 * Attempts Stripe Connect transfers per line item. Does not throw on transfer failure;
 * returns structured failures for persistence on the order document.
 */
async function transferToSellersForOrder(order: FirestoreOrder & { id: string }): Promise<PayoutTransferAttempt> {
  const failures: PayoutFailureRecord[] = [];
  const successes: PayoutTransferWrite[] = [];
  const alreadyTransferredKeys = new Set((order.payoutTransferIds || []).map((t) => t.lineKey));

  for (const [lineIndex, item] of order.items.entries()) {
    const lineKey = `${order.id}:${lineIndex}:${item.listingId}:${item.sellerId}`;
    if (alreadyTransferredKeys.has(lineKey)) {
      continue;
    }

    const itemTotal = item.unitPrice * item.qty;
    const { sellerPayout } = calculateSellerPayout(itemTotal, PLATFORM_SERVICE_FEE_PERCENT);
    const sellerProfile = await getProfileDocumentAdmin(item.sellerId);

    if (!sellerProfile?.stripeConnectAccountId || !sellerProfile?.stripeConnectOnboardingComplete) {
      continue;
    }

    const transferIdempotencyKey = `payout_${order.id}_${lineIndex}_${item.listingId}_${item.sellerId}`
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 200);
    const transferResult = await transferToSeller(
      sellerProfile.stripeConnectAccountId,
      sellerPayout,
      order.id,
      transferIdempotencyKey
    );
    if (!transferResult.success) {
      failures.push({
        sellerId: item.sellerId,
        listingId: item.listingId,
        error: transferResult.error || 'unknown error',
      });
    } else if (transferResult.transferId) {
      successes.push({
        lineKey,
        sellerId: item.sellerId,
        listingId: item.listingId,
        transferId: transferResult.transferId,
        amount: sellerPayout,
        at: Timestamp.fromDate(new Date()),
      });
    }
  }

  return { failures, successes };
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
    serverLogger.info('stripe_webhook_event_received', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      eventType: event.type,
    });
    if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const lock = await acquireEventLock(event.id, event.type);
      eventRef = lock.eventRef;

      if (lock.result === 'processed') {
        return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
      }

      if (lock.result === 'processing') {
        return NextResponse.json({ received: true, processing: true }, { status: 200 });
      }

      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = typeof session.metadata?.orderId === 'string' ? session.metadata.orderId.trim() : '';
      if (orderId) {
        await markOrderCancelled(orderId, session.id);
      }

      await markEventCompleted(eventRef, orderId || 'n/a');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (
      event.type !== 'checkout.session.completed' &&
      event.type !== 'checkout.session.async_payment_succeeded'
    ) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const lock = await acquireEventLock(event.id, event.type);
    eventRef = lock.eventRef;
    serverLogger.info('stripe_webhook_lock_status', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      eventType: event.type,
      lockResult: lock.result,
    });

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

    let order = await getOrderAdmin(orderId);
    if (!order) {
      throw new Error(`Order not found for orderId ${orderId}`);
    }
    assertSessionMatchesOrder(fullSession, order);
    if (
      order.lastStripeCheckoutSessionId === fullSession.id &&
      order.checkoutWebhookSettledAt
    ) {
      await markEventCompleted(eventRef, orderId);
      return NextResponse.json({ received: true, idempotent: true, orderId }, { status: 200 });
    }

    const paymentIntentId = getPaymentIntentId(fullSession);
    serverLogger.info('stripe_webhook_processing_paid', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      orderId,
      sessionId: fullSession.id,
      paymentIntentId,
    });
    await markOrderPaid(orderId, paymentIntentId, fullSession.id);
    await ensurePaymentRecord({
      orderId,
      userId: order.buyerId,
      amount: order.total,
      currency: order.currency,
      stripeReference: paymentIntentId || fullSession.id,
    });

    order = await getOrderAdmin(orderId);
    if (!order) {
      throw new Error(`Order not found after payment update for ${orderId}`);
    }

    if (order.inventoryAdjusted !== true) {
      for (const item of order.items) {
        await updateInventoryAdmin(item.listingId, item.qty);
      }

      await updateOrderAdmin(orderId, {
        inventoryAdjusted: true,
        inventoryAdjustedAt: FieldValue.serverTimestamp(),
      });
      serverLogger.info('stripe_webhook_inventory_adjusted', {
        route: 'api/stripe/webhook',
        eventId: event.id,
        orderId,
      });
      order.inventoryAdjusted = true;
    }

    if (order.payoutsProcessed !== true) {
      const payoutResult = await transferToSellersForOrder(order);
      const mergedTransfers = [...(order.payoutTransferIds || []), ...payoutResult.successes];

      if (payoutResult.failures.length === 0) {
        await updateOrderAdmin(orderId, {
          payoutsProcessed: true,
          payoutsProcessedAt: FieldValue.serverTimestamp(),
          payoutStatus: 'complete',
          payoutRetryable: false,
          payoutFailures: [],
          payoutTransferIds: mergedTransfers,
        });
        serverLogger.info('stripe_webhook_payout_complete', {
          route: 'api/stripe/webhook',
          eventId: event.id,
          orderId,
          sessionId: fullSession.id,
        });
        order.payoutsProcessed = true;
      } else {
        const stamped = payoutResult.failures.map((f) => ({
          sellerId: f.sellerId,
          listingId: f.listingId,
          error: f.error,
          at: Timestamp.fromDate(new Date()),
        }));
        await updateOrderAdmin(orderId, {
          payoutsProcessed: false,
          payoutStatus: 'partial_failed',
          payoutFailures: stamped,
          payoutRetryable: true,
          payoutTransferIds: mergedTransfers,
        });
        serverLogger.warn('stripe_webhook_payout_partial_failed', {
          route: 'api/stripe/webhook',
          eventId: event.id,
          orderId,
          sessionId: fullSession.id,
          failureCount: stamped.length,
        });
      }
    }

    order = (await getOrderAdmin(orderId)) ?? order;

    if (order.cartCleared !== true) {
      await clearCartAdmin(order.buyerId);
      await updateOrderAdmin(orderId, {
        cartCleared: true,
        cartClearedAt: FieldValue.serverTimestamp(),
      });
      serverLogger.info('stripe_webhook_cart_cleared', {
        route: 'api/stripe/webhook',
        eventId: event.id,
        orderId,
        userId: order.buyerId,
      });
      order.cartCleared = true;
    }

    await processOrderEmails({
      orderId,
      sessionId: fullSession.id,
      order,
    });
    await updateOrderAdmin(orderId, {
      lastStripeCheckoutSessionId: fullSession.id,
      checkoutWebhookSettledAt: FieldValue.serverTimestamp(),
    });
    serverLogger.info('stripe_webhook_settled', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      orderId,
      sessionId: fullSession.id,
      paymentIntentId,
    });

    await markEventCompleted(eventRef, orderId);
    return NextResponse.json({ received: true, orderId }, { status: 200 });
  } catch (error) {
    if (eventRef) {
      await markEventFailed(eventRef, error);
    }

    serverLogger.error('stripe_webhook_fatal', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response('Webhook error', { status: 500 });
  }
}
