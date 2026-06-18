import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { CheckoutSnapshot, CreateOrderInput, FirestoreOrder } from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

/**
 * Read an order using Firebase Admin (bypasses client security rules).
 * Use from API routes only — caller must enforce authorization.
 */
export async function getOrderAdmin(orderId: string): Promise<(FirestoreOrder & { id: string }) | null> {
  const snap = await getAdminFirestore().collection(COLLECTIONS.ORDERS).doc(orderId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as FirestoreOrder) };
}

/**
 * Create a pending order (checkout). Caller must supply validated order payload.
 */
export async function createOrderAdmin(orderData: CreateOrderInput): Promise<string> {
  const sellerIds = [...new Set(orderData.items.map((item) => item.sellerId))];
  const ref = getAdminFirestore().collection(COLLECTIONS.ORDERS).doc();
  await ref.set({
    ...orderData,
    sellerIds,
    status: 'pending' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/**
 * Atomically creates an order from a validated checkout snapshot.
 *
 * In one Firestore transaction:
 *   1. Re-verifies every listing is still active and has enough inventory
 *   2. Creates the order document (status: 'paid' — no zombie 'pending' orders)
 *   3. Decrements inventory for each line item
 *   4. Clears the buyer's cart
 *   5. Marks the snapshot as processed
 *
 * Throws if any listing is unavailable — the transaction rolls back cleanly.
 */
export async function createOrderFromSnapshotAdmin(
  snapshot: CheckoutSnapshot & { id: string },
  opts: { paymentIntentId?: string; checkoutSessionId: string }
): Promise<string> {
  const db = getAdminFirestore();

  return db.runTransaction(async (tx) => {
    // --- 1. Re-verify inventory (prevents oversell race) ---
    const listingRefs = snapshot.items.map((item) =>
      db.collection(COLLECTIONS.LISTINGS).doc(item.listingId)
    );
    const listingDocs = await Promise.all(listingRefs.map((ref) => tx.get(ref)));

    for (let i = 0; i < snapshot.items.length; i++) {
      const item = snapshot.items[i];
      const doc = listingDocs[i];
      const data = doc.data();
      if (!doc.exists || !data?.isActive) {
        throw new Error(`"${item.title}" is no longer available`);
      }
      if ((data.inventory ?? 0) < item.qty) {
        throw new Error(`"${item.title}" has insufficient stock`);
      }
    }

    // --- 2. Create order (already paid) ---
    const orderRef = db.collection(COLLECTIONS.ORDERS).doc();
    const sellerIds = [...new Set(snapshot.items.map((i) => i.sellerId))];
    tx.set(orderRef, {
      buyerId: snapshot.buyerId,
      items: snapshot.items,
      sellerIds,
      subtotal: snapshot.subtotal,
      tax: snapshot.tax,
      fees: snapshot.fees,
      total: snapshot.total,
      currency: snapshot.currency,
      shippingAddress: snapshot.shippingAddress,
      shipping: snapshot.shippingRate,
      checkoutSessionId: opts.checkoutSessionId,
      paymentIntentId: opts.paymentIntentId ?? null,
      status: 'paid' as const,
      paidAt: FieldValue.serverTimestamp(),
      // Mark fulfillment steps as done (handled atomically here)
      inventoryAdjusted: true,
      inventoryAdjustedAt: FieldValue.serverTimestamp(),
      cartCleared: true,
      cartClearedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // --- 3. Decrement inventory ---
    for (let i = 0; i < snapshot.items.length; i++) {
      tx.update(listingRefs[i], {
        inventory: FieldValue.increment(-snapshot.items[i].qty),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // --- 4. Clear buyer cart ---
    const cartRef = db.collection(COLLECTIONS.CARTS).doc(snapshot.buyerId);
    tx.set(cartRef, { items: [], updatedAt: FieldValue.serverTimestamp() });

    // --- 5. Mark snapshot processed ---
    const snapshotRef = db.collection(COLLECTIONS.CHECKOUT_SNAPSHOTS).doc(snapshot.sessionId);
    tx.update(snapshotRef, {
      status: 'processed',
      orderId: orderRef.id,
      processedAt: FieldValue.serverTimestamp(),
    });

    return orderRef.id;
  });
}

/**
 * Patch top-level order fields using Admin SDK.
 */
export async function updateOrderAdmin(orderId: string, updates: Record<string, unknown>): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.ORDERS)
    .doc(orderId)
    .update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
}
