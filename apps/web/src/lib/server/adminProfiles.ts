import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { FirestoreProfile } from '@/lib/firestore';

export async function getProfileDocumentAdmin(userId: string): Promise<FirestoreProfile | null> {
  const snap = await getAdminFirestore().collection('profiles').doc(userId).get();
  if (!snap.exists) return null;
  return snap.data() as FirestoreProfile;
}

export async function mergeProfileAdmin(userId: string, data: Record<string, unknown>): Promise<void> {
  await getAdminFirestore()
    .collection('profiles')
    .doc(userId)
    .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

function normalizeUsername(raw: string): string {
  return raw.toLowerCase().trim().replace(/^@/, '').replace(/\s+/g, '');
}

function validateUsernameFormat(username: string): void {
  if (username.length < 3) throw new Error('Username must be at least 3 characters long');
  if (username.length > 30) throw new Error('Username must be 30 characters or less');
  if (!/^[a-z0-9._]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, underscores, and periods');
  }
}

export async function isUsernameAvailableAdmin(
  normalizedUsername: string,
  excludeUserId?: string
): Promise<boolean> {
  const snap = await getAdminFirestore()
    .collection('usernames')
    .doc(normalizedUsername)
    .get();
  if (!snap.exists) return true;
  return (snap.data() as { userId: string }).userId === excludeUserId;
}

export async function saveProfileAdmin(
  userId: string,
  profileData: Partial<FirestoreProfile>
): Promise<FirestoreProfile> {
  const db = getAdminFirestore();

  // Validate username format before entering the transaction.
  let newUsername: string | undefined;
  if (profileData.username !== undefined) {
    newUsername = normalizeUsername(profileData.username);
    validateUsernameFormat(newUsername);
  }

  const profileRef = db.collection('profiles').doc(userId);

  await db.runTransaction(async (tx) => {
    const existingSnap = await tx.get(profileRef);
    const existingProfile = existingSnap.exists ? (existingSnap.data() as FirestoreProfile) : null;

    const currentUsername = existingProfile?.username ?? '';
    const usernameChanging = newUsername !== undefined && newUsername !== currentUsername;

    let resolvedUsername = newUsername ?? currentUsername;

    if (usernameChanging && newUsername) {
      const sentinelRef = db.collection('usernames').doc(newUsername);
      const sentinelSnap = await tx.get(sentinelRef);

      if (sentinelSnap.exists && (sentinelSnap.data() as { userId: string }).userId !== userId) {
        throw new Error('This username is already taken. Please choose another one.');
      }

      // Claim the new username sentinel.
      tx.set(sentinelRef, { userId, claimedAt: FieldValue.serverTimestamp() });

      // Release the old username sentinel if the user had one.
      if (currentUsername) {
        tx.delete(db.collection('usernames').doc(currentUsername));
      }
    }

    const profileToSave: Record<string, unknown> = {
      userId,
      username: resolvedUsername,
      displayName: profileData.displayName ?? existingProfile?.displayName ?? resolvedUsername,
      bio: profileData.bio ?? existingProfile?.bio ?? '',
      createdAt: existingProfile?.createdAt ?? FieldValue.serverTimestamp(),
      interestCategories: profileData.interestCategories ?? existingProfile?.interestCategories ?? [],
      userActivity: profileData.userActivity ?? existingProfile?.userActivity ?? 'both-buy-sell',
      itemConditionPreference: profileData.itemConditionPreference ?? existingProfile?.itemConditionPreference ?? 'both',
      updatedAt: FieldValue.serverTimestamp(),
    };

    const optionalFields: Array<keyof FirestoreProfile> = [
      'gender', 'age', 'profilePicture', 'phoneNumber', 'budget',
      'shoppingFrequency', 'shippingAddress', 'stripeConnectAccountId',
      'stripeConnectOnboardingComplete',
    ];
    for (const key of optionalFields) {
      const val = profileData[key] ?? existingProfile?.[key];
      if (val !== undefined) profileToSave[key] = val;
    }

    // Remove undefined values before writing.
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(profileToSave)) {
      if (v !== undefined) clean[k] = v;
    }

    tx.set(profileRef, clean, { merge: true });
  });

  const saved = await getProfileDocumentAdmin(userId);
  if (!saved) throw new Error('Failed to retrieve saved profile');
  return saved;
}
