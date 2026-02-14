import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const EMAIL_LOGS_COLLECTION = 'email_logs';

export type EmailLogType = 'order_confirmation' | 'seller_notification' | 'verification';

export interface EmailLogEntry {
  type: EmailLogType;
  to: string;
  status: 'success' | 'failed';
  orderId?: string;
  error?: string;
  createdAt: FieldValue;
}

export async function logEmail(
  type: EmailLogType,
  to: string,
  status: 'success' | 'failed',
  options?: { orderId?: string; error?: string }
): Promise<void> {
  try {
    const firestore = getAdminFirestore();
    await firestore.collection(EMAIL_LOGS_COLLECTION).add({
      type,
      to,
      status,
      orderId: options?.orderId ?? null,
      error: options?.error ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    // Do not throw; logging failure must not break callers
  }
}
