import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  verifyWebhookSignature,
  transferToSeller,
  calculateSellerPayout,
  PLATFORM_SERVICE_FEE_PERCENT,
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
import type { FirestoreOrder, PayoutTransferRecord } from '@/lib/types/firestore';
import { serverLogger } from '@/lib/server/logger';

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
  if (!params.order || params.order.emailSent === true) return;

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
  if (!params.order) return;

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
  if (!process.env.SHIPPO_API_KEY?.trim()) return;
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

type PayoutFailureRecord = { sellerId: string; error: string; listingId: string };
type PayoutTransferWrite = Omit<PayoutTransferRecord, 'at'> & { at: unknown };
type PayoutTransferAttempt = {
  failures: PayoutFailureRecord[];
  successes: PayoutTransferWrite[];
  pendingConnect: string[];
};

async function transferToSellersForOrder(
  order: FirestoreOrder & { id: string }
): Promise<PayoutTransferAttempt> {
  const failures: PayoutFailureRecord[] = [];
  const successes: PayoutTransferWrite[] = [];
  const pendingConnect: string[] = [];
  const alreadyTransferredKeys = new Set(
    (order.payoutTransferIds || []).map((t) => t.lineKey)
  );

  for (const [lineIndex, item] of order.items.entries()) {
    const lineKey = `${order.id}:${lineIndex}:${item.listingId}:${item.sellerId}`;
    if (alreadyTransferredKeys.has(lineKey)) continue;

    const itemTotal = item.unitPrice * item.qty;
    const { sellerPayout } = calculateSellerPayout(itemTotal, PLATFORM_SERVICE_FEE_PERCENT);
    const sellerProfile = await getProfileDocumentAdmin(item.sellerId);

    if (!sellerProfile?.stripeConnectAccountId || !sellerProfile.stripeConnectOnboardingComplete) {
      pendingConnect.push(item.sellerId);
      serverLogger.warn('stripe_webhook_payout_no_connect', {
        orderId: order.id,
        sellerId: item.sellerId,
        listingId: item.listingId,
        amount: sellerPayout,
      });
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
      failures.push({ sellerId: item.sellerId, listingId: item.listingId, error: transferResult.error || 'unknown error' });
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

  return { failures, successes, pendingConnect };
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

    // Idempotency: snapshot already processed means order exists.
    if (snapshot.status === 'processed' && snapshot.orderId) {
      await markEventCompleted(eventRef, snapshot.orderId);
      serverLogger.info('stripe_webhook_idempotent_snapshot', {
        sessionId: fullSession.id,
        orderId: snapshot.orderId,
      });
      return NextResponse.json({ received: true, idempotent: true, orderId: snapshot.orderId }, { status: 200 });
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
    const orderId = await createOrderFromSnapshotAdmin(snapshot, {
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

    const payoutResult = await transferToSellersForOrder(order);
    const mergedTransfers = [...(order.payoutTransferIds || []), ...payoutResult.successes];

    if (payoutResult.failures.length === 0 && payoutResult.pendingConnect.length === 0) {
      await updateOrderAdmin(orderId, {
        payoutsProcessed: true,
        payoutsProcessedAt: FieldValue.serverTimestamp(),
        payoutStatus: 'complete',
        payoutRetryable: false,
        payoutFailures: [],
        payoutTransferIds: mergedTransfers,
      });
      serverLogger.info('stripe_webhook_payout_complete', { orderId, sessionId: fullSession.id });
    } else if (payoutResult.failures.length === 0 && payoutResult.pendingConnect.length > 0) {
      await updateOrderAdmin(orderId, {
        payoutsProcessed: false,
        payoutStatus: 'pending_connect',
        payoutRetryable: true,
        payoutFailures: [],
        payoutPendingConnectSellerIds: payoutResult.pendingConnect,
        payoutTransferIds: mergedTransfers,
      });
      serverLogger.warn('stripe_webhook_payout_pending_connect', {
        orderId,
        pendingConnectCount: payoutResult.pendingConnect.length,
      });
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
        orderId,
        failureCount: stamped.length,
      });
    }

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
  const payoutResult = await transferToSellersForOrder(finalOrder);
  const mergedTransfers = [...(finalOrder.payoutTransferIds || []), ...payoutResult.successes];

  if (payoutResult.failures.length === 0 && payoutResult.pendingConnect.length === 0) {
    await updateOrderAdmin(orderId, {
      payoutsProcessed: true,
      payoutsProcessedAt: FieldValue.serverTimestamp(),
      payoutStatus: 'complete',
      payoutRetryable: false,
      payoutFailures: [],
      payoutTransferIds: mergedTransfers,
    });
  } else if (payoutResult.failures.length === 0 && payoutResult.pendingConnect.length > 0) {
    await updateOrderAdmin(orderId, {
      payoutsProcessed: false,
      payoutStatus: 'pending_connect',
      payoutRetryable: true,
      payoutFailures: [],
      payoutPendingConnectSellerIds: payoutResult.pendingConnect,
      payoutTransferIds: mergedTransfers,
    });
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
  }

  await processOrderEmails({ orderId, sessionId: fullSession.id, order: finalOrder });
  await updateOrderAdmin(orderId, {
    lastStripeCheckoutSessionId: fullSession.id,
    checkoutWebhookSettledAt: FieldValue.serverTimestamp(),
  });
  await markEventCompleted(eventRef, orderId);
}
