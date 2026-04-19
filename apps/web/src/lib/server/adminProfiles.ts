import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * Merge profile fields using Admin SDK (for server routes where client rules would block writes).
 */
export async function mergeProfileAdmin(userId: string, data: Record<string, unknown>): Promise<void> {
  await getAdminFirestore()
    .collection('profiles')
    .doc(userId)
    .set(
      {
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}
