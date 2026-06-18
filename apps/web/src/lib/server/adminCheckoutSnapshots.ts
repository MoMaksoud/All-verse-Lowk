import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { CheckoutSnapshot, CheckoutSnapshotItem } from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

const COL = COLLECTIONS.CHECKOUT_SNAPSHOTS;

// Stripe checkout sessions expire after 30 minutes; match that TTL.
const SESSION_TTL_MS = 30 * 60 * 1000;

export async function createCheckoutSnapshotAdmin(
  sessionId: string,
  data: {
    buyerId: string;
    items: CheckoutSnapshotItem[];
    subtotal: number;
    tax: number;
    fees: number;
    total: number;
    shippingAddress: CheckoutSnapshot['shippingAddress'];
    shippingRate: CheckoutSnapshot['shippingRate'];
    currency: string;
  }
): Promise<void> {
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + SESSION_TTL_MS));
  await getAdminFirestore()
    .collection(COL)
    .doc(sessionId)
    .set({
      ...data,
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
    await getAdminFirestore()
      .collection(COL)
      .doc(sessionId)
      .update({ status: 'expired', updatedAt: FieldValue.serverTimestamp() });
  } catch {
    // Snapshot may not exist for sessions created before this deploy — ignore.
  }
}
