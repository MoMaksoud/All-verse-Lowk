import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';
import { withApi } from '@/lib/withApi';
import { fail, ok } from '@/lib/api/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/confirm?session_id=...
 * Retrieves Checkout Session from Stripe, reads metadata.orderId, fetches order from Firestore.
 * Returns sanitized order summary. Do not trust query params for order lookup.
 */
export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId?.trim()) {
    return fail({ status: 400, code: 'MISSING_SESSION_ID', message: 'Missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim(), {
      expand: [],
    });

    const orderId = typeof session.metadata?.orderId === 'string' ? session.metadata.orderId.trim() : null;
    if (!orderId) {
      return fail({ status: 400, code: 'INVALID_SESSION', message: 'Invalid session or missing order' });
    }

    const order = await firestoreServices.orders.getOrder(orderId);
    if (!order) {
      return fail({ status: 404, code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    if (order.buyerId !== req.userId) {
      return fail({ status: 403, code: 'FORBIDDEN', message: 'Forbidden' });
    }

    if (session.payment_status !== 'paid') {
      return fail({ status: 409, code: 'PAYMENT_NOT_SETTLED', message: 'Payment is not completed yet' });
    }

    const expectedAmountCents = Math.round(order.total * 100);
    if (typeof session.amount_total === 'number' && session.amount_total !== expectedAmountCents) {
      return fail({ status: 409, code: 'PAYMENT_AMOUNT_MISMATCH', message: 'Payment amount mismatch' });
    }
    if (typeof session.currency === 'string' && session.currency.toLowerCase() !== order.currency.toLowerCase()) {
      return fail({ status: 409, code: 'PAYMENT_CURRENCY_MISMATCH', message: 'Payment currency mismatch' });
    }

    return ok({
      order: {
        orderId: (order as any).id,
        orderIdShort: ((order as any).id as string).slice(0, 8),
        status: order.status,
        total: order.total,
        itemCount: order.items.length,
      },
    });
  } catch (err) {
    console.error('[payments/confirm]', err);
    return fail({ status: 500, code: 'PAYMENT_CONFIRM_FAILED', message: 'Failed to confirm session' });
  }
});
