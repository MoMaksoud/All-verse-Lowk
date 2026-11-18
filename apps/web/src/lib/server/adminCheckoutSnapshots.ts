import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { CheckoutSnapshot, CheckoutSnapshotItem, SellerShippingRate } from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

const COL = COLLECTIONS.CHECKOUT_SNAPSHOTS;

// Stripe checkout sessions expire after 30 minutes; match that TTL.
const SESSION_TTL_MS = 30 * 60 * 1000;

export async function createCheckoutSnapshotAdmin(
  sessionId: string,
  data: {
    stripeMode: 'test' | 'live';
    buyerId: string;
    items: CheckoutSnapshotItem[];
    subtotal: number;
    tax: number;
    fees: number;
    total: number;
    shippingAddress: CheckoutSnapshot['shippingAddress'];
    shippingRate: CheckoutSnapshot['shippingRate'];
    sellerShippingRates?: SellerShippingRate[];
    currency: string;
  }
): Promise<void> {
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + SESSION_TTL_MS));
  const { sellerShippingRates, ...requiredData } = data;

  await getAdminFirestore()
    .collection(COL)
    .doc(sessionId)
    .set({
      ...requiredData,
      ...(sellerShippingRates !== undefined ? { sellerShippingRates } : {}),
      sessionId,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });
}

export async function getCheckoutSnapshotAdmin(
  sessionId: string
): Promise<(CheckoutSnapshot & { id: string }) | null> {
  const snap = await getAdminFirestore().collection(COL).doc(sessionId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as CheckoutSnapshot) };
}

export async function markSnapshotExpiredAdmin(sessionId: string): Promise<void> {
  try {
    const db = getAdminFirestore();
    const ref = db.collection(COL).doc(sessionId);
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.get('orderId')) return;
      tx.update(ref, { status: 'expired', updatedAt: FieldValue.serverTimestamp() });
    });
  } catch {
    // Snapshot may not exist for sessions created before this deploy — ignore.
  }
}
