import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { calculateSellerPayout, getConnectAccount, stripe, transferToSeller } from '@/lib/stripe';
import { getProfileDocumentAdmin } from '@/lib/server/adminProfiles';
import { getOrderAdmin, recordPayoutTransferAdmin, updateOrderAdmin } from '@/lib/server/adminOrders';
import type { FirestoreOrder, PayoutTransferRecord } from '@/lib/types/firestore';
import { assertPaymentPersistence, assertStripeObjectMode, getStripeMode } from './environment';

export function payoutLineKey(orderId: string, index: number, listingId: string, sellerId: string) {
  return `${orderId}:${index}:${listingId}:${sellerId}`;
}

/** Shared by webhook and ops retry; every payable line must have a transfer. */
export async function settleSellerPayouts(order: FirestoreOrder & { id: string }) {
  assertPaymentPersistence();
  if (order.stripeMode && order.stripeMode !== getStripeMode()) throw new Error('Order belongs to a different Stripe mode.');
  if (!['paid', 'shipped', 'delivered'].includes(order.status) || !order.items.length) throw new Error('Only a paid order with payable items can be settled.');
  const failures: Array<{ sellerId: string; listingId: string; error: string; at: Timestamp }> = [];
  const pending = new Set<string>();
  const transferred = new Set((order.payoutTransferIds || []).map(t => t.lineKey));
  let sourceChargeId = order.paymentSourceChargeId;
  let retriesApplied = 0;
  for (const [index, item] of order.items.entries()) {
    const lineKey = payoutLineKey(order.id, index, item.listingId, item.sellerId);
    if (transferred.has(lineKey)) continue;
    try {
      const profile = await getProfileDocumentAdmin(item.sellerId);
      if (!profile?.stripeConnectAccountId) { pending.add(item.sellerId); continue; }
      const connected = await getConnectAccount(profile.stripeConnectAccountId);
      if (!connected.success || !connected.account) throw new Error('Unable to verify seller Connect account.');
      if (connected.account.metadata?.userId !== item.sellerId) throw new Error('Seller Connect account ownership does not match.');
      if (connected.account.capabilities?.transfers !== 'active' || !connected.payoutsEnabled) { pending.add(item.sellerId); continue; }
      if (!sourceChargeId) {
        if (!order.paymentIntentId) throw new Error('Original payment intent is missing; reconciliation is required.');
        const intent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
        assertStripeObjectMode(intent.livemode);
        if (intent.status !== 'succeeded') throw new Error('Original payment has not succeeded.');
        sourceChargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
        if (!sourceChargeId) throw new Error('Original payment source charge is missing.');
        await updateOrderAdmin(order.id, { paymentSourceChargeId: sourceChargeId });
      }
      const { sellerPayout } = calculateSellerPayout(item.unitPrice * item.qty);
      if (!Number.isFinite(sellerPayout) || sellerPayout <= 0) throw new Error('Invalid seller payable amount.');
      const key = `payout_${order.id}_${index}_${item.listingId}_${item.sellerId}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 200);
      const result = await transferToSeller(profile.stripeConnectAccountId, sellerPayout, order.id, key, sourceChargeId);
      if (!result.success || !result.transferId) throw new Error(result.error || 'Seller transfer failed.');
      const record: PayoutTransferRecord = { lineKey, sellerId: item.sellerId, listingId: item.listingId,
        transferId: result.transferId, amount: sellerPayout, at: Timestamp.now() as any };
      await recordPayoutTransferAdmin(order.id, record);
      transferred.add(lineKey);
      retriesApplied++;
    } catch (error) {
      failures.push({ sellerId: item.sellerId, listingId: item.listingId,
        error: error instanceof Error ? error.message : 'Seller transfer failed.', at: Timestamp.now() });
    }
  }
  const refreshed = await getOrderAdmin(order.id);
  const settledKeys = new Set((refreshed?.payoutTransferIds || []).map(t => t.lineKey));
  const complete = order.items.every((item, index) => settledKeys.has(payoutLineKey(order.id, index, item.listingId, item.sellerId)));
  const payoutStatus = complete ? 'complete' : failures.length ? 'partial_failed' : 'pending_connect';
  await updateOrderAdmin(order.id, {
    payoutsProcessed: complete, payoutStatus, payoutRetryable: !complete,
    payoutFailures: complete ? [] : failures,
    payoutPendingConnectSellerIds: complete ? [] : [...pending],
    ...(complete ? { payoutsProcessedAt: FieldValue.serverTimestamp() } : {}),
  });
  return { payoutStatus, retriesApplied, failureCount: failures.length, pendingConnectCount: pending.size };
}
