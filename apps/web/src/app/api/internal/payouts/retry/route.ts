import { NextRequest, NextResponse } from 'next/server';
import { getOrderAdmin } from '@/lib/server/adminOrders';
import { settleSellerPayouts } from '@/lib/payments/sellerPayouts';
import { assertStripeConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expected = process.env.INTERNAL_OPS_TOKEN?.trim();
  const provided = req.headers.get('x-internal-token')?.trim();
  if (!expected) return NextResponse.json({ error: 'Internal operations are not configured' }, { status: 500 });
  if (!provided || provided !== expected) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    assertStripeConfig();
    const body = await req.json();
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    const order = await getOrderAdmin(orderId);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!['paid', 'shipped', 'delivered'].includes(order.status)) {
      return NextResponse.json({ error: 'Only paid orders can be settled' }, { status: 409 });
    }
    // A missing payout state after an interrupted webhook is also recoverable.
    const result = await settleSellerPayouts(order);
    return NextResponse.json({ success: result.payoutStatus === 'complete', orderId, ...result });
  } catch {
    return NextResponse.json({ error: 'Payout retry failed; inspect configuration and settlement state' }, { status: 500 });
  }
}
