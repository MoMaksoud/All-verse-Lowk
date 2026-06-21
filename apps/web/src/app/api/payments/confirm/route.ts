import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderAdmin } from '@/lib/server/adminOrders';
import { getCheckoutSnapshotAdmin } from '@/lib/server/adminCheckoutSnapshots';
import { withApi } from '@/lib/withApi';
import { fail, ok } from '@/lib/api/responses';
import { serverLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/confirm?session_id=...
 *
 * Verifies the Stripe session belongs to the authenticated user and that
 * the order has been created (webhook may be a few seconds behind).
 * Reads orderId from the checkout snapshot — not from session metadata —
 * so the caller never needs to trust client-supplied order IDs.
 */
export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId?.trim()) {
    return fail({ status: 400, code: 'MISSING_SESSION_ID', message: 'Missing session_id' });
  }

  try {
    // Verify the session is real and paid (Stripe is the authority).
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim(), { expand: [] });

    if (session.payment_status !== 'paid') {
      return fail({
        status: 409,
        code: 'PAYMENT_NOT_SETTLED',
        message: 'Payment is not completed yet',
      });
    }

    // Load snapshot — it contains orderId once the webhook has run.
    const snapshot = await getCheckoutSnapshotAdmin(sessionId.trim());

    if (!snapshot) {
      // Legacy flow: session was created before snapshot-based deploy.
      // Fall back to session.metadata.orderId.
      const legacyOrderId =
        typeof session.metadata?.orderId === 'string' ? session.metadata.orderId.trim() : null;
      if (!legacyOrderId) {
        return fail({
          status: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found. If you just paid, it may take a few seconds to appear.',
        });
      }
      return await resolveOrder(legacyOrderId, req.userId, session, 'legacy');
    }

    // Validate ownership at snapshot level.
    if (snapshot.buyerId !== req.userId) {
      return fail({ status: 403, code: 'FORBIDDEN', message: 'Forbidden' });
    }

    if (snapshot.status !== 'processed' || !snapshot.orderId) {
      // Webhook hasn't fired yet — tell the client to retry in a moment.
      return fail({
        status: 202,
        code: 'ORDER_PROCESSING',
        message: 'Your payment was received. The order is being created — please wait a moment.',
      });
    }

    return await resolveOrder(snapshot.orderId, req.userId, session, 'snapshot');
  } catch (err) {
    serverLogger.error('payment_confirm_failed', {
      route: 'api/payments/confirm',
      userId: req.userId,
      error: err instanceof Error ? err.message : 'Failed to confirm session',
    });
    return fail({ status: 500, code: 'PAYMENT_CONFIRM_FAILED', message: 'Failed to confirm payment' });
  }
});

async function resolveOrder(
  orderId: string,
  userId: string,
  session: import('stripe').Stripe.Checkout.Session,
  source: 'snapshot' | 'legacy'
) {
  const order = await getOrderAdmin(orderId);
  if (!order) {
    return fail({ status: 404, code: 'ORDER_NOT_FOUND', message: 'Order not found' });
  }

  if (order.buyerId !== userId) {
    return fail({ status: 403, code: 'FORBIDDEN', message: 'Forbidden' });
  }

  const expectedAmountCents = Math.round(order.total * 100);
  if (
    typeof session.amount_total === 'number' &&
    session.amount_total !== expectedAmountCents
  ) {
    return fail({ status: 409, code: 'PAYMENT_AMOUNT_MISMATCH', message: 'Payment amount mismatch' });
  }

  serverLogger.info('payment_confirm_ok', {
    route: 'api/payments/confirm',
    orderId,
    userId,
    sessionId: session.id,
    source,
  });

  return ok({
    order: {
      orderId: order.id,
      orderIdShort: (order.id as string).slice(0, 8),
      status: order.status,
      total: order.total,
      itemCount: order.items.length,
    },
  });
}
