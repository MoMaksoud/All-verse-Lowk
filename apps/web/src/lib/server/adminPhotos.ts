import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { ListingPhotoUpload, ProfilePhotoUpload } from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

export async function saveProfilePhotoAdmin(data: ProfilePhotoUpload): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.PROFILE_PHOTOS)
    .doc(data.userId)
    .set({
      ...data,
      uploadedAt: FieldValue.serverTimestamp(),
    });
}

export async function saveListingPhotosAdmin(data: ListingPhotoUpload): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.LISTING_PHOTOS)
    .doc(data.listingId)
    .set({
      ...data,
      uploadedAt: FieldValue.serverTimestamp(),
    });
}

export async function getListingPhotosAdmin(listingId: string): Promise<ListingPhotoUpload | null> {
  const snap = await getAdminFirestore().collection(COLLECTIONS.LISTING_PHOTOS).doc(listingId).get();
  if (!snap.exists) return null;
  return { ...snap.data(), listingId } as ListingPhotoUpload;
}

export async function deleteListingPhotosAdmin(listingId: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.LISTING_PHOTOS).doc(listingId).delete();
}
