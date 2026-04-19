import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { FirestoreOrder } from '@/lib/types/firestore';

/**
 * Read an order using Firebase Admin (bypasses client security rules).
 * Use from API routes only — caller must enforce authorization.
 */
export async function getOrderAdmin(orderId: string): Promise<(FirestoreOrder & { id: string }) | null> {
  const snap = await getAdminFirestore().collection('orders').doc(orderId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as FirestoreOrder) };
}

/**
 * Patch top-level order fields using Admin SDK.
 */
export async function updateOrderAdmin(orderId: string, updates: Record<string, unknown>): Promise<void> {
  await getAdminFirestore()
    .collection('orders')
    .doc(orderId)
    .update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
}
