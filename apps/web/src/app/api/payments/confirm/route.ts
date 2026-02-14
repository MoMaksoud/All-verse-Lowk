import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { firestoreServices } from '@/lib/services/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/confirm?session_id=...
 * Retrieves Checkout Session from Stripe, reads metadata.orderId, fetches order from Firestore.
 * Returns sanitized order summary. Do not trust query params for order lookup.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId?.trim()) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim(), {
      expand: [],
    });

    const orderId = typeof session.metadata?.orderId === 'string' ? session.metadata.orderId.trim() : null;
    if (!orderId) {
      return NextResponse.json({ error: 'Invalid session or missing order' }, { status: 400 });
    }

    const order = await firestoreServices.orders.getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
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
    return NextResponse.json(
      { error: 'Failed to confirm session' },
      { status: 500 }
    );
  }
}
