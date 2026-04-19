import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  CreatePaymentInput,
  FirestorePayment,
  UpdatePaymentInput,
} from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

export type PaymentDoc = FirestorePayment & { id: string };

export async function createPaymentAdmin(data: CreatePaymentInput): Promise<string> {
  const ref = getAdminFirestore().collection(COLLECTIONS.PAYMENTS).doc();
  await ref.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updatePaymentAdmin(paymentId: string, updates: UpdatePaymentInput): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.PAYMENTS)
    .doc(paymentId)
    .update(updates as Record<string, unknown>);
}

export async function getPaymentsByOrderAdmin(orderId: string): Promise<PaymentDoc[]> {
  const snap = await getAdminFirestore()
    .collection(COLLECTIONS.PAYMENTS)
    .where('orderId', '==', orderId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestorePayment) }));
}
