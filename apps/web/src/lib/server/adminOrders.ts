import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { CreateOrderInput, FirestoreOrder } from '@/lib/types/firestore';
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
