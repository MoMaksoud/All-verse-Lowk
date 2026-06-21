import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { FirestoreUser, UpdateUserInput } from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

export async function getUserAdmin(uid: string): Promise<(FirestoreUser & { id: string }) | null> {
  const snap = await getAdminFirestore().collection(COLLECTIONS.USERS).doc(uid).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as FirestoreUser) };
}

/** Mirrors UsersService.updateUser merge behavior for server routes. */
export async function updateUserAdmin(uid: string, updates: UpdateUserInput): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.USERS)
    .doc(uid)
    .set(
      {
        profilePic: updates.profilePic || updates.photoURL || '/logo.png',
        displayName: updates.displayName || 'User',
        role: updates.role || 'buyer',
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export async function ensureUserDocMinimalAdmin(uid: string): Promise<void> {
  const ref = getAdminFirestore().collection(COLLECTIONS.USERS).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ profilePic: '/logo.png' }, { merge: true });
  }
}
