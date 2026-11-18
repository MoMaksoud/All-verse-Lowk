import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createOrderFromSnapshotAdmin, recordPayoutTransferAdmin } from './adminOrders';
import { createPaymentAdmin } from './adminPayments';
import { markSnapshotExpiredAdmin } from './adminCheckoutSnapshots';

const enabled = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8085' &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'demo-allverse-sandbox';
describe.runIf(enabled)('commerce concurrency against the demo emulator', () => {
  const app = enabled ? initializeApp({ projectId: 'demo-allverse-sandbox' }) : null;
  const db = app ? getFirestore(app) : null;
  const prefix = `regression-${Date.now()}`;
  let snapshot: any;
  beforeAll(async () => {
    snapshot = { id: `${prefix}-session`, sessionId: `${prefix}-session`, buyerId: `${prefix}-buyer`,
      stripeMode: 'test', status: 'pending', currency: 'USD', subtotal: 10, tax: 0, fees: 0, total: 10,
      shippingAddress: { name: 'Test Buyer', street: '1 Test St', city: 'New York', state: 'NY', zip: '10001', country: 'US' },
      shippingRate: { carrier: 'Sandbox', serviceName: 'Simulated', price: 0, rateId: 'rate', shipmentId: 'shipment' },
      items: [{ listingId: `${prefix}-listing`, title: 'Synthetic item', sellerId: 'sandbox-seller', qty: 1, unitPrice: 10 }] };
    await db.collection('checkout_snapshots').doc(snapshot.sessionId).set(snapshot);
    await db.collection('listings').doc(`${prefix}-listing`).set({ title: 'Synthetic item', sellerId: 'sandbox-seller', inventory: 10, isActive: true, sold: false });
    await db.collection('carts').doc(snapshot.buyerId).set({ items: [{ listingId: `${prefix}-listing` }, { listingId: 'another-seller-item' }] });
  });
  afterAll(async () => { if (app) await deleteApp(app); });

  it('settles concurrent distinct deliveries once while preserving the rest of the cart', async () => {
    const outcomes = await Promise.all(Array.from({ length: 8 }, () => createOrderFromSnapshotAdmin(snapshot, { paymentIntentId: 'pi_synthetic', checkoutSessionId: snapshot.sessionId })));
    expect(new Set(outcomes).size).toBe(1);
    const orders = await db.collection('orders').where('checkoutSessionId', '==', snapshot.sessionId).get();
    expect(orders.size).toBe(1);
    expect((await db.collection('listings').doc(`${prefix}-listing`).get()).get('inventory')).toBe(9);
    expect((await db.collection('carts').doc(snapshot.buyerId).get()).get('items')).toEqual([{ listingId: 'another-seller-item' }]);
  }, 20000);

  it('deduplicates concurrent payment receipts and transfer receipts', async () => {
    const orderId = `${prefix}-receipt-order`;
    await db.collection('orders').doc(orderId).set({ payoutTransferIds: [] });
    const payment: any = { orderId, userId: snapshot.buyerId, amount: 10, currency: 'USD', stripeEventId: 'pi_synthetic', status: 'succeeded' };
    const receipts = await Promise.all(Array.from({ length: 6 }, () => createPaymentAdmin(payment)));
    expect(new Set(receipts).size).toBe(1);
    expect((await db.collection('payments').where('orderId', '==', orderId).get()).size).toBe(1);
    const record: any = { lineKey: 'line', transferId: 'tr_synthetic', sellerId: 'sandbox-seller', listingId: 'listing', amount: 9.55, at: Timestamp.now() };
    await Promise.all(Array.from({ length: 6 }, () => recordPayoutTransferAdmin(orderId, record)));
    expect((await db.collection('orders').doc(orderId).get()).get('payoutTransferIds')).toHaveLength(1);
  }, 20000);

  it('does not regress an already-paid snapshot when a late expiry arrives', async () => {
    const sessionId = `${prefix}-late-expiry`;
    await db.collection('checkout_snapshots').doc(sessionId).set({ status: 'processed', orderId: 'existing-order' });
    await markSnapshotExpiredAdmin(sessionId);
    expect((await db.collection('checkout_snapshots').doc(sessionId).get()).get('status')).toBe('processed');
  });
});
