import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getOrderAdmin, updateOrderAdmin } from '@/lib/server/adminOrders';
import { getProfileDocumentAdmin } from '@/lib/server/adminProfiles';
import { calculateSellerPayout, PLATFORM_SERVICE_FEE_PERCENT, transferToSeller } from '@/lib/stripe';
import { serverLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getLineKey(orderId: string, lineIndex: number, listingId: string, sellerId: string): string {
  return `${orderId}:${lineIndex}:${listingId}:${sellerId}`;
}

export async function POST(req: NextRequest) {
  const expected = process.env.INTERNAL_OPS_TOKEN?.trim();
  const provided = req.headers.get('x-internal-token')?.trim();

  if (!expected) {
    return NextResponse.json({ error: 'INTERNAL_OPS_TOKEN is not configured' }, { status: 500 });
  }
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await getOrderAdmin(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.payoutRetryable && order.payoutStatus !== 'partial_failed') {
      return NextResponse.json(
        { error: 'Order is not in a retryable payout state' },
        { status: 409 }
      );
    }

    const existingTransfers = order.payoutTransferIds || [];
    const existingLineKeys = new Set(existingTransfers.map((t) => t.lineKey));
    const newTransfers: Array<{
      lineKey: string;
      sellerId: string;
      listingId: string;
      transferId: string;
      amount: number;
      at: unknown;
    }> = [];
    const failures: Array<{ sellerId: string; listingId?: string; error: string; at: unknown }> = [];

    for (const [lineIndex, item] of order.items.entries()) {
      const lineKey = getLineKey(order.id, lineIndex, item.listingId, item.sellerId);
      if (existingLineKeys.has(lineKey)) continue;

      const sellerProfile = await getProfileDocumentAdmin(item.sellerId);
      if (!sellerProfile?.stripeConnectAccountId || !sellerProfile.stripeConnectOnboardingComplete) {
        continue;
      }

      const itemTotal = item.unitPrice * item.qty;
      const { sellerPayout } = calculateSellerPayout(itemTotal, PLATFORM_SERVICE_FEE_PERCENT);
      const transferIdempotencyKey = `payout_${order.id}_${lineIndex}_${item.listingId}_${item.sellerId}`
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 200);

      const result = await transferToSeller(
        sellerProfile.stripeConnectAccountId,
        sellerPayout,
        order.id,
        transferIdempotencyKey
      );

      if (!result.success || !result.transferId) {
        failures.push({
          sellerId: item.sellerId,
          listingId: item.listingId,
          error: result.error || 'unknown payout error',
          at: Timestamp.fromDate(new Date()),
        });
        continue;
      }

      newTransfers.push({
        lineKey,
        sellerId: item.sellerId,
        listingId: item.listingId,
        transferId: result.transferId,
        amount: sellerPayout,
        at: Timestamp.fromDate(new Date()),
      });
    }

    const mergedTransferIds = [...existingTransfers, ...newTransfers];
    if (failures.length === 0) {
      await updateOrderAdmin(order.id, {
        payoutsProcessed: true,
        payoutsProcessedAt: FieldValue.serverTimestamp(),
        payoutStatus: 'complete',
        payoutRetryable: false,
        payoutFailures: [],
        payoutTransferIds: mergedTransferIds,
      });
      serverLogger.info('internal_payout_retry_complete', {
        route: 'api/internal/payouts/retry',
        orderId: order.id,
        retriesApplied: newTransfers.length,
      });
      return NextResponse.json({
        success: true,
        orderId: order.id,
        payoutStatus: 'complete',
        retriesApplied: newTransfers.length,
      });
    }

    await updateOrderAdmin(order.id, {
      payoutsProcessed: false,
      payoutStatus: 'partial_failed',
      payoutRetryable: true,
      payoutFailures: failures,
      payoutTransferIds: mergedTransferIds,
    });
    serverLogger.warn('internal_payout_retry_partial_failed', {
      route: 'api/internal/payouts/retry',
      orderId: order.id,
      retriesApplied: newTransfers.length,
      failures: failures.length,
    });
    return NextResponse.json({
      success: false,
      orderId: order.id,
      payoutStatus: 'partial_failed',
      retriesApplied: newTransfers.length,
      failures: failures.length,
    });
  } catch (error) {
    serverLogger.error('internal_payout_retry_fatal', {
      route: 'api/internal/payouts/retry',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to retry payouts' }, { status: 500 });
  }
}
