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
 *   4. Removes only this order's items from the buyer's cart
 *   5. Marks the snapshot as processed
 *
 * Cart clearing is per-item, not a full wipe: Depop-style checkout pays each
 * seller separately, so paying one seller must leave the other sellers' items
 * in the cart for their own payment.
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
    const cartRef = db.collection(COLLECTIONS.CARTS).doc(snapshot.buyerId);
    // All transaction reads must precede writes.
    const listingDocs = await Promise.all(listingRefs.map((ref) => tx.get(ref)));
    const cartDoc = await tx.get(cartRef);

    for (let i = 0; i < snapshot.items.length; i++) {
      const item = snapshot.items[i];
      const doc = listingDocs[i];
      const data = doc.data();
      // Match the app's availability rules: isActive defaults to active unless
      // explicitly false, inventory is 1 unit when unset, sold flag respected.
      const active = data?.isActive !== false;
      const sold = (data?.sold ?? false) === true;
      const availableQty = typeof data?.inventory === 'number' ? data.inventory : 1;
      if (!doc.exists || !active || sold) {
        throw new Error(`"${item.title}" is no longer available`);
      }
      if (availableQty < item.qty) {
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
    // Compute explicitly (legacy docs may have undefined inventory → treat as 1)
    // so stock never goes negative, and flip isActive/sold when it hits zero.
    for (let i = 0; i < snapshot.items.length; i++) {
      const data = listingDocs[i].data();
      const currentQty = typeof data?.inventory === 'number' ? data.inventory : 1;
      const newQty = Math.max(0, currentQty - snapshot.items[i].qty);
      tx.update(listingRefs[i], {
        inventory: newQty,
        isActive: newQty > 0,
        sold: newQty <= 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // --- 4. Remove only this order's items from the buyer cart ---
    // (Other sellers' items stay so they can be paid for separately.)
    const orderedListingIds = new Set(snapshot.items.map((i) => i.listingId));
    const existingCartItems: Array<{ listingId: string }> = Array.isArray(cartDoc.data()?.items)
      ? (cartDoc.data()!.items as Array<{ listingId: string }>)
      : [];
    const remainingCartItems = existingCartItems.filter(
      (item) => !orderedListingIds.has(item.listingId)
    );
    tx.set(cartRef, { items: remainingCartItems, updatedAt: FieldValue.serverTimestamp() });

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
export async function getOrdersByBuyerAdmin(
  buyerId: string,
  limit = 20
): Promise<(FirestoreOrder & { id: string })[]> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.ORDERS)
    .where('buyerId', '==', buyerId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirestoreOrder) }));
}

export async function updateOrderAdmin(orderId: string, updates: Record<string, unknown>): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.ORDERS)
    .doc(orderId)
    .update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
}
