import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import {
  verifyWebhookSignature,
  stripe,
} from '@/lib/stripe';
import { sendOrderConfirmationEmail, sendSellerNotificationEmail, sendBuyerTrackingEmail } from '@/lib/email';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { logEmail } from '@/lib/emailLog';
import { assertStripeWebhookConfig, getMissingSendGridVars } from '@/lib/config';
import { getOrderAdmin, updateOrderAdmin, createOrderFromSnapshotAdmin } from '@/lib/server/adminOrders';
import { createPaymentAdmin, getPaymentsByOrderAdmin, updatePaymentAdmin } from '@/lib/server/adminPayments';
import { getProfileDocumentAdmin } from '@/lib/server/adminProfiles';
import { sendPushNotification } from '@/lib/server/push-notifications';
import {
  getCheckoutSnapshotAdmin,
  markSnapshotExpiredAdmin,
} from '@/lib/server/adminCheckoutSnapshots';
import {
  acquireShippingLabelLock,
  createAndResolveShippoLabel,
  markShippingLabelSuccess,
  markShippingLabelFailed,
} from '@/lib/payments/shippingLabel';
import type { FirestoreOrder } from '@/lib/types/firestore';
import { serverLogger } from '@/lib/server/logger';

import { settleSellerPayouts } from './sellerPayouts';
import { assertStripeObjectMode, getStripeMode } from './environment';

const WEBHOOK_LOCK_TTL_MS = 5 * 60 * 1000;

function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://allversegpt.com';
  return raw.split(/\s/)[0].replace(/\/$/, '');
}

function getPaymentIntentId(session: Stripe.Checkout.Session): string | undefined {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  if (session.payment_intent && typeof session.payment_intent === 'object') return session.payment_intent.id;
  return undefined;
}

async function acquireEventLock(eventId: string, eventType: string) {
  const adminDb = getAdminFirestore();
  const eventRef = adminDb.collection('stripe_webhook_events').doc(eventId);

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(eventRef);
    const existing = snap.data() as
      | { processed?: boolean; processing?: boolean; processingStartedAt?: number }
      | undefined;

    const now = Date.now();
    const processingStartedAt = existing?.processingStartedAt ?? 0;
    const processingIsFresh = now - processingStartedAt < WEBHOOK_LOCK_TTL_MS;

    if (existing?.processed === true) return 'processed' as const;
    if (existing?.processing === true && processingIsFresh) return 'processing' as const;

    tx.set(
      eventRef,
      {
        eventId,
        type: eventType,
        processed: false,
        processing: true,
        processingStartedAt: now,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: snap.exists
          ? snap.get('createdAt') ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return 'acquired' as const;
  });

  return { eventRef, result };
}

async function markEventCompleted(
  eventRef: FirebaseFirestore.DocumentReference,
  orderId: string
) {
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

async function markEventFailed(
  eventRef: FirebaseFirestore.DocumentReference,
  error: unknown
) {
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
        .filter((p) => p.status !== 'succeeded')
        .map((p) => updatePaymentAdmin(p.id, { status: 'succeeded' }))
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
  if (getStripeMode() === 'test' || !params.order || params.order.emailSent === true) return;

  const missingSendGrid = getMissingSendGridVars();
  if (missingSendGrid.length > 0) {
    serverLogger.warn('stripe_webhook_emails_skipped', {
      orderId: params.orderId,
      missing: missingSendGrid,
    });
    return;
  }

  const auth = getAdminAuth();
  const buyerProfile = await getProfileDocumentAdmin(params.order.buyerId);
  const buyerUser = auth ? await auth.getUser(params.order.buyerId) : null;
  const buyerEmail = buyerUser?.email;
  let allEmailsOk = true;

  if (buyerEmail && buyerProfile) {
    try {
      const buyerResult = await sendOrderConfirmationEmail({
        orderId: params.orderId,
        buyerName: buyerProfile.displayName || 'Customer',
        buyerEmail,
        items: params.order.items.map((item) => ({
          title: item.title,
          qty: item.qty,
          unitPrice: item.unitPrice,
        })),
        subtotal: params.order.subtotal,
        tax: params.order.tax,
        fees: params.order.fees,
        total: params.order.total,
        shippingAddress: params.order.shippingAddress,
        stripeReference: params.sessionId,
      });
      await logEmail(
        'order_confirmation',
        buyerEmail,
        buyerResult.success ? 'success' : 'failed',
        { orderId: params.orderId, error: buyerResult.error }
      );
      if (!buyerResult.success) allEmailsOk = false;
    } catch (error) {
      allEmailsOk = false;
      await logEmail('order_confirmation', buyerEmail, 'failed', {
        orderId: params.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const item of params.order.items) {
    const sellerProfile = await getProfileDocumentAdmin(item.sellerId);
    const sellerUser = auth ? await auth.getUser(item.sellerId) : null;
    const sellerEmail = sellerUser?.email;
    if (!sellerProfile || !sellerEmail) continue;

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
      if (!sellerResult.success) allEmailsOk = false;
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

async function processOrderPushNotifications(params: {
  orderId: string;
  order: FirestoreOrder | null;
}): Promise<void> {
  if (getStripeMode() === 'test' || !params.order) return;

  // Notify buyer: order confirmed
  const buyerProfile = await getProfileDocumentAdmin(params.order.buyerId);
  const buyerToken = (buyerProfile as any)?.expoPushToken;
  if (buyerToken) {
    await sendPushNotification({
      to: buyerToken,
      title: '✅ Order confirmed!',
      body: `Your ${params.order.items.length} item${params.order.items.length > 1 ? 's are' : ' is'} on the way. Total: $${params.order.total.toFixed(2)}.`,
      data: { type: 'order', orderId: params.orderId },
    }).catch(() => {});
  }

  // Notify each seller: item sold
  const uniqueSellerIds = [...new Set(params.order.items.map((i) => i.sellerId))];
  for (const sellerId of uniqueSellerIds) {
    const sellerProfile = await getProfileDocumentAdmin(sellerId);
    const sellerToken = (sellerProfile as any)?.expoPushToken;
    if (!sellerToken) continue;

    const sellerItems = params.order.items.filter((i) => i.sellerId === sellerId);
    const itemTitle = sellerItems[0]?.title || 'Your item';
    const saleTotal = sellerItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

    await sendPushNotification({
      to: sellerToken,
      title: '🎉 You made a sale!',
      body: `"${itemTitle}" sold for $${saleTotal.toFixed(2)}. Check your sales dashboard.`,
      data: { type: 'sale', orderId: params.orderId },
    }).catch(() => {});
  }
}

async function attemptAutoShippingLabel(orderId: string, order: FirestoreOrder): Promise<void> {
  if (getStripeMode() === 'test' || !process.env.SHIPPO_API_KEY?.trim()) return;
  if (!order.shipping?.rateId || !order.shipping?.shipmentId) return;
  if (order.status === 'shipped' || order.status === 'delivered') return;

  const adminDb = getAdminFirestore();
  const { rateId, shipmentId } = order.shipping;

  const lockResult = await acquireShippingLabelLock({ adminDb, orderId, rateId, shipmentId });
  if (lockResult.action === 'already_exists') {
    // Label already created — ensure order is marked shipped
    await updateOrderAdmin(orderId, {
      status: 'shipped',
      shippedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }
  if (lockResult.action === 'processing') return;

  try {
    const shippoResult = await createAndResolveShippoLabel(rateId);
    await markShippingLabelSuccess({
      adminDb,
      orderId,
      trackingNumber: shippoResult.trackingNumber,
      labelUrl: shippoResult.labelUrl,
      carrier: shippoResult.carrier,
      service: shippoResult.service,
      rateId,
      shipmentId,
    });
    serverLogger.info('webhook_auto_label_created', { orderId });

    await updateOrderAdmin(orderId, {
      status: 'shipped',
      shippedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send tracking email + push notification to buyer
    const auth = getAdminAuth();
    if (auth) {
      const buyerUser = await auth.getUser(order.buyerId).catch(() => null);
      const buyerProfile = await getProfileDocumentAdmin(order.buyerId);
      if (buyerUser?.email && buyerProfile) {
        const trackingResult = await sendBuyerTrackingEmail({
          orderId,
          buyerName: buyerProfile.displayName || 'Customer',
          buyerEmail: buyerUser.email,
          trackingNumber: shippoResult.trackingNumber,
          carrier: shippoResult.carrier,
          service: shippoResult.service,
          labelUrl: shippoResult.labelUrl,
          items: order.items.map((i) => ({ title: i.title, qty: i.qty })),
        });
        await logEmail(
          'buyer_tracking',
          buyerUser.email,
          trackingResult.success ? 'success' : 'failed',
          { orderId, error: trackingResult.error }
        );

        // Push notification for shipping
        const buyerToken = (buyerProfile as any)?.expoPushToken;
        if (buyerToken) {
          sendPushNotification({
            to: buyerToken,
            title: '🚚 Your order is on its way!',
            body: `Tracking: ${shippoResult.trackingNumber} via ${shippoResult.carrier}.`,
            data: { type: 'shipped', orderId, trackingNumber: shippoResult.trackingNumber },
          }).catch(() => {});
        }
      }
    }
  } catch (labelErr) {
    serverLogger.warn('webhook_auto_label_failed', {
      orderId,
      error: labelErr instanceof Error ? labelErr.message : String(labelErr),
    });
    try {
      await markShippingLabelFailed({ adminDb, orderId, error: labelErr });
    } catch {
      // ignore cleanup failure
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    assertStripeWebhookConfig();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Config validation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const missingSendGrid = getMissingSendGridVars();
  if (missingSendGrid.length > 0) {
    serverLogger.warn('stripe_webhook_sendgrid_missing', {
      missing: missingSendGrid,
      note: 'Emails will be skipped; payment processing continues.',
    });
  }

  let eventRef: FirebaseFirestore.DocumentReference | null = null;

  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });

    const verification = verifyWebhookSignature(payload, signature, webhookSecret);
    if (!verification.success || !verification.event) {
      return NextResponse.json({ error: verification.error || 'Invalid event' }, { status: 400 });
    }

    const event = verification.event;
    try { assertStripeObjectMode(event.livemode); } catch {
      return NextResponse.json({ error: 'Stripe event mode mismatch' }, { status: 400 });
    }
    serverLogger.info('stripe_webhook_event_received', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      eventType: event.type,
    });

    // ── Expired / failed sessions ──────────────────────────────────────────
    if (
      event.type === 'checkout.session.expired' ||
      event.type === 'checkout.session.async_payment_failed'
    ) {
      const lock = await acquireEventLock(event.id, event.type);
      eventRef = lock.eventRef;
      if (lock.result === 'processed') return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
      if (lock.result === 'processing') return NextResponse.json({ received: true, processing: true }, { status: 200 });

      const session = event.data.object as Stripe.Checkout.Session;
      // Mark snapshot expired so ops can see it; no order to cancel.
      await markSnapshotExpiredAdmin(session.id);

      await markEventCompleted(eventRef, 'n/a');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (
      event.type !== 'checkout.session.completed' &&
      event.type !== 'checkout.session.async_payment_succeeded'
    ) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── Payment succeeded ──────────────────────────────────────────────────
    const lock = await acquireEventLock(event.id, event.type);
    eventRef = lock.eventRef;
    serverLogger.info('stripe_webhook_lock_status', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      eventType: event.type,
      lockResult: lock.result,
    });

    if (lock.result === 'processed') return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
    if (lock.result === 'processing') return NextResponse.json({ received: true, processing: true }, { status: 200 });

    const session = event.data.object as Stripe.Checkout.Session;
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: [] });
    assertStripeObjectMode(fullSession.livemode);

    if (fullSession.payment_status !== 'paid') {
      throw new Error(`Session ${fullSession.id} payment_status is not 'paid': ${fullSession.payment_status}`);
    }

    // ── Load snapshot ──────────────────────────────────────────────────────
    const snapshot = await getCheckoutSnapshotAdmin(fullSession.id);

    if (!snapshot) {
      // No snapshot means this session was created under the old flow (pre-deploy).
      // Fall back: look for orderId in metadata and run the legacy path.
      const legacyOrderId =
        typeof fullSession.metadata?.orderId === 'string'
          ? fullSession.metadata.orderId.trim()
          : '';
      if (!legacyOrderId) {
        throw new Error(`No snapshot and no legacy orderId for session ${fullSession.id}`);
      }
      serverLogger.warn('stripe_webhook_legacy_order_path', {
        sessionId: fullSession.id,
        orderId: legacyOrderId,
      });
      await runLegacyOrderPath(fullSession, legacyOrderId, eventRef);
      return NextResponse.json({ received: true, orderId: legacyOrderId }, { status: 200 });
    }

    // A processed snapshot proves order creation, not completion of post-commit steps.
    if (snapshot.stripeMode && snapshot.stripeMode !== getStripeMode()) {
      throw new Error('Checkout snapshot belongs to a different Stripe mode');
    }

    // Validate amount before creating anything.
    const expectedCents = Math.round(snapshot.total * 100);
    if (typeof fullSession.amount_total === 'number' && fullSession.amount_total !== expectedCents) {
      throw new Error(
        `Amount mismatch for session ${fullSession.id}: expected ${expectedCents}, got ${fullSession.amount_total}`
      );
    }

    const paymentIntentId = getPaymentIntentId(fullSession);
    serverLogger.info('stripe_webhook_creating_order', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      sessionId: fullSession.id,
      buyerId: snapshot.buyerId,
      paymentIntentId,
    });

    // ── Atomic: create order + decrement inventory + clear cart ───────────
    const orderId = snapshot.status === 'processed' && snapshot.orderId
      ? snapshot.orderId
      : await createOrderFromSnapshotAdmin(snapshot, {
      paymentIntentId,
      checkoutSessionId: fullSession.id,
    });

    serverLogger.info('stripe_webhook_order_created', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      orderId,
      sessionId: fullSession.id,
    });

    // ── Payment record ─────────────────────────────────────────────────────
    await ensurePaymentRecord({
      orderId,
      userId: snapshot.buyerId,
      amount: snapshot.total,
      currency: snapshot.currency,
      stripeReference: paymentIntentId || fullSession.id,
    });

    // ── Seller payouts ─────────────────────────────────────────────────────
    let order = await getOrderAdmin(orderId);
    if (!order) throw new Error(`Order ${orderId} not found after creation`);

    await settleSellerPayouts(order);

    // ── Emails ─────────────────────────────────────────────────────────────
    order = (await getOrderAdmin(orderId)) ?? order;
    await processOrderEmails({ orderId, sessionId: fullSession.id, order });

    // ── Push notifications (best-effort) ───────────────────────────────────
    processOrderPushNotifications({ orderId, order }).catch(() => {});

    // ── Auto shipping label (best-effort) ──────────────────────────────────
    try {
      await attemptAutoShippingLabel(orderId, order);
    } catch (labelErr) {
      serverLogger.warn('webhook_auto_label_unhandled', {
        orderId,
        error: labelErr instanceof Error ? labelErr.message : String(labelErr),
      });
    }

    await markEventCompleted(eventRef, orderId);
    serverLogger.info('stripe_webhook_settled', {
      route: 'api/stripe/webhook',
      eventId: event.id,
      orderId,
      sessionId: fullSession.id,
      paymentIntentId,
    });

    return NextResponse.json({ received: true, orderId }, { status: 200 });
  } catch (error) {
    if (eventRef) await markEventFailed(eventRef, error);
    serverLogger.error('stripe_webhook_fatal', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response('Webhook error', { status: 500 });
  }
}

// ============================================================================
// LEGACY PATH — for Stripe sessions created before the snapshot-based deploy.
// Handles the old flow where orderId was in session.metadata.
// ============================================================================
async function runLegacyOrderPath(
  fullSession: Stripe.Checkout.Session,
  orderId: string,
  eventRef: FirebaseFirestore.DocumentReference
) {
  const order = await getOrderAdmin(orderId);
  if (!order) throw new Error(`Legacy order ${orderId} not found`);

  if (
    order.lastStripeCheckoutSessionId === fullSession.id &&
    order.checkoutWebhookSettledAt
  ) {
    await markEventCompleted(eventRef, orderId);
    return;
  }

  const paymentIntentId = getPaymentIntentId(fullSession);

  // Mark order paid if not already.
  if (order.status !== 'paid' && order.status !== 'shipped' && order.status !== 'delivered') {
    await updateOrderAdmin(orderId, {
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      checkoutSessionId: fullSession.id,
      ...(paymentIntentId ? { paymentIntentId } : {}),
    });
  }

  await ensurePaymentRecord({
    orderId,
    userId: order.buyerId,
    amount: order.total,
    currency: order.currency,
    stripeReference: paymentIntentId || fullSession.id,
  });

  // Inventory + cart (idempotent guards already on order doc).
  const refreshed = await getOrderAdmin(orderId);
  if (!refreshed) throw new Error(`Order ${orderId} not found after legacy pay update`);

  if (!refreshed.inventoryAdjusted) {
    for (const item of refreshed.items) {
      const { updateInventoryAdmin } = await import('@/lib/server/adminListings');
      await updateInventoryAdmin(item.listingId, item.qty);
    }
    await updateOrderAdmin(orderId, {
      inventoryAdjusted: true,
      inventoryAdjustedAt: FieldValue.serverTimestamp(),
    });
  }

  if (!refreshed.cartCleared) {
    const { clearCartAdmin } = await import('@/lib/server/adminCarts');
    await clearCartAdmin(refreshed.buyerId);
    await updateOrderAdmin(orderId, {
      cartCleared: true,
      cartClearedAt: FieldValue.serverTimestamp(),
    });
  }

  const finalOrder = (await getOrderAdmin(orderId)) ?? refreshed;
  await settleSellerPayouts(finalOrder);

  await processOrderEmails({ orderId, sessionId: fullSession.id, order: finalOrder });
  await updateOrderAdmin(orderId, {
    lastStripeCheckoutSessionId: fullSession.id,
    checkoutWebhookSettledAt: FieldValue.serverTimestamp(),
  });
  await markEventCompleted(eventRef, orderId);
}
