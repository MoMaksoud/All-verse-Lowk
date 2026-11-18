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
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTIONS.PAYMENTS).doc(data.orderId);
  await db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const payment = existing.data() as FirestorePayment;
      if (payment.stripeEventId !== data.stripeEventId || payment.userId !== data.userId ||
          payment.amount !== data.amount || payment.currency !== data.currency) throw new Error('Conflicting payment receipt requires reconciliation');
      return;
    }
    tx.set(ref, { ...data, createdAt: FieldValue.serverTimestamp() });
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
