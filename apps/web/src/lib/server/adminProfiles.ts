import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { FirestoreProfile } from '@/lib/firestore';

/**
 * Read profile document (Admin). Used by server routes and webhooks.
 */
export async function getProfileDocumentAdmin(userId: string): Promise<FirestoreProfile | null> {
  const snap = await getAdminFirestore().collection('profiles').doc(userId).get();
  if (!snap.exists) return null;
  return snap.data() as FirestoreProfile;
}

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

async function isUsernameAvailableAdmin(normalizedUsername: string, excludeUserId?: string): Promise<boolean> {
  const snap = await getAdminFirestore()
    .collection('profiles')
    .where('username', '==', normalizedUsername)
    .limit(10)
    .get();
  const taken = snap.docs.some((d) => d.id !== excludeUserId);
  return !taken;
}

/**
 * Full profile save for PUT /api/profile — mirrors ProfileService.saveProfile using Admin SDK.
 */
export async function saveProfileAdmin(
  userId: string,
  profileData: Partial<FirestoreProfile>
): Promise<FirestoreProfile> {
  const existingProfile = await getProfileDocumentAdmin(userId);

  if (profileData.username !== undefined && profileData.username !== existingProfile?.username) {
    const normalizedUsername = profileData.username.toLowerCase().trim().replace(/^@/, '').replace(/\s+/g, '');
    if (normalizedUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    if (normalizedUsername.length > 30) {
      throw new Error('Username must be 30 characters or less');
    }
    if (!/^[a-z0-9._]+$/.test(normalizedUsername)) {
      throw new Error('Username can only contain letters, numbers, underscores, and periods');
    }
    const available = await isUsernameAvailableAdmin(normalizedUsername, userId);
    if (!available) {
      throw new Error('This username is already taken. Please choose another one.');
    }
  }

  const profileToSave: Record<string, unknown> = {
    userId,
    username: profileData.username
      ? profileData.username.toLowerCase().trim().replace(/^@/, '').replace(/\s+/g, '')
      : existingProfile?.username ?? '',
    displayName:
      profileData.displayName ?? existingProfile?.displayName ?? existingProfile?.username ?? '',
    bio: profileData.bio ?? existingProfile?.bio ?? '',
    createdAt: existingProfile?.createdAt ?? FieldValue.serverTimestamp(),
    interestCategories: profileData.interestCategories ?? existingProfile?.interestCategories ?? [],
    userActivity: profileData.userActivity ?? existingProfile?.userActivity ?? 'both-buy-sell',
    itemConditionPreference:
      profileData.itemConditionPreference ?? existingProfile?.itemConditionPreference ?? 'both',
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (profileData.gender !== undefined || existingProfile?.gender !== undefined) {
    profileToSave.gender = profileData.gender ?? existingProfile?.gender;
  }
  if (profileData.age !== undefined || existingProfile?.age !== undefined) {
    profileToSave.age = profileData.age ?? existingProfile?.age;
  }
  if (profileData.profilePicture !== undefined || existingProfile?.profilePicture) {
    profileToSave.profilePicture = profileData.profilePicture ?? existingProfile?.profilePicture ?? '';
  }
  if (profileData.phoneNumber !== undefined || existingProfile?.phoneNumber) {
    profileToSave.phoneNumber = profileData.phoneNumber ?? existingProfile?.phoneNumber ?? '';
  }
  if (profileData.budget !== undefined || existingProfile?.budget) {
    const budget = profileData.budget ?? existingProfile?.budget;
    if (budget) {
      const cleanBudget: Record<string, unknown> = {};
      if (budget.min !== undefined && budget.min !== null) cleanBudget.min = budget.min;
      if (budget.max !== undefined && budget.max !== null) cleanBudget.max = budget.max;
      if (budget.currency) cleanBudget.currency = budget.currency;
      if (Object.keys(cleanBudget).length > 0) {
        profileToSave.budget = cleanBudget;
      }
    }
  }
  if (profileData.shoppingFrequency !== undefined || existingProfile?.shoppingFrequency !== undefined) {
    profileToSave.shoppingFrequency =
      profileData.shoppingFrequency ?? existingProfile?.shoppingFrequency;
  }
  if (profileData.shippingAddress !== undefined || existingProfile?.shippingAddress) {
    const shippingAddress = profileData.shippingAddress ?? existingProfile?.shippingAddress;
    if (shippingAddress) {
      const cleanShippingAddress: Record<string, unknown> = {};
      if (shippingAddress.street !== undefined && shippingAddress.street !== null) {
        cleanShippingAddress.street = shippingAddress.street;
      }
      if (shippingAddress.city !== undefined && shippingAddress.city !== null) {
        cleanShippingAddress.city = shippingAddress.city;
      }
      if (shippingAddress.state !== undefined && shippingAddress.state !== null) {
        cleanShippingAddress.state = shippingAddress.state;
      }
      if (shippingAddress.zip !== undefined && shippingAddress.zip !== null) {
        cleanShippingAddress.zip = shippingAddress.zip;
      }
      if (shippingAddress.country !== undefined && shippingAddress.country !== null) {
        cleanShippingAddress.country = shippingAddress.country;
      }
      if (Object.keys(cleanShippingAddress).length > 0) {
        profileToSave.shippingAddress = cleanShippingAddress;
      }
    }
  }
  if (profileData.stripeConnectAccountId !== undefined || existingProfile?.stripeConnectAccountId) {
    profileToSave.stripeConnectAccountId =
      profileData.stripeConnectAccountId ?? existingProfile?.stripeConnectAccountId;
  }
  if (
    profileData.stripeConnectOnboardingComplete !== undefined ||
    existingProfile?.stripeConnectOnboardingComplete !== undefined
  ) {
    profileToSave.stripeConnectOnboardingComplete =
      profileData.stripeConnectOnboardingComplete ?? existingProfile?.stripeConnectOnboardingComplete;
  }

  const cleanedProfile: Record<string, unknown> = {};
  Object.keys(profileToSave).forEach((key) => {
    if (profileToSave[key] !== undefined) {
      cleanedProfile[key] = profileToSave[key];
    }
  });

  await getAdminFirestore().collection('profiles').doc(userId).set(cleanedProfile, { merge: true });

  const saved = await getProfileDocumentAdmin(userId);
  if (!saved) {
    throw new Error('Failed to retrieve saved profile');
  }
  return saved;
}
