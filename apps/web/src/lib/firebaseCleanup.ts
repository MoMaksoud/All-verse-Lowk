import { FieldValue } from 'firebase-admin/firestore';
import StorageService from '@/lib/storage';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';

/**
 * Comprehensive cleanup service for Firebase resources
 * Handles deletion of listings and all associated data
 */
export class FirebaseCleanupService {
  /**
   * Delete a listing and all its associated Firebase resources
   * @param listingId - The ID of the listing to delete
   * @param userId - The ID of the user who owns the listing
   * @returns Promise with cleanup results
   */
  static async deleteListingCompletely(listingId: string, userId: string): Promise<{
    success: boolean;
    deletedPhotos: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedPhotos = 0;

    try {
      const adminDb = getAdminFirestore();
      const listingRef = adminDb.collection(COLLECTIONS.LISTINGS).doc(listingId);
      const listingSnap = await listingRef.get();
      const existingListing = listingSnap.exists ? listingSnap.data() : null;
      if (!existingListing) {
        throw new Error('Listing not found');
      }

      // Check if user owns this listing
      if (existingListing.sellerId !== userId) {
        throw new Error('You can only delete your own listings');
      }

      // 1. Delete all photos from Firebase Storage
      try {
        if (existingListing.images && existingListing.images.length > 0) {
          await StorageService.deleteAllListingPhotos(userId, listingId);
          deletedPhotos = existingListing.images.length;
        }
      } catch (storageError) {
        const errorMsg = `Failed to delete photos from Firebase Storage: ${storageError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        // Continue with Firestore deletion even if storage cleanup fails
      }

      // 2. Delete any photo metadata from Firestore
      try {
        await adminDb.collection(COLLECTIONS.LISTING_PHOTOS).doc(listingId).delete();
      } catch (photoMetadataError) {
        const errorMsg = `Failed to delete photo metadata: ${photoMetadataError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        // Continue with listing deletion even if photo metadata cleanup fails
      }

      // 3. Delete the listing from Firestore
      await listingRef.delete();

      return {
        success: true,
        deletedPhotos,
        errors
      };

    } catch (err) {
      const errorMsg = `Failed to delete listing: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      console.error(err);
      errors.push(errorMsg);
      
      return {
        success: false,
        deletedPhotos,
        errors
      };
    }
  }

  /**
   * Delete a user's profile photo and all associated data
   * @param userId - The ID of the user
   * @returns Promise with cleanup results
   */
  static async deleteProfilePhotoCompletely(userId: string): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const adminDb = getAdminFirestore();
      const photoSnap = await adminDb.collection(COLLECTIONS.PROFILE_PHOTOS).doc(userId).get();
      const photoData = photoSnap.exists ? photoSnap.data() : null;
      
      if (photoData) {
        // Delete from Firebase Storage
        try {
          await StorageService.deleteFile(photoData.photoUrl);
        } catch (storageError) {
          const errorMsg = `Failed to delete profile photo from Firebase Storage: ${storageError}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
        
        // Delete from Firestore
        try {
          await adminDb.collection(COLLECTIONS.PROFILE_PHOTOS).doc(userId).delete();
        } catch (firestoreError) {
          const errorMsg = `Failed to delete profile photo metadata: ${firestoreError}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
        
        // Update user profile to remove photo URL
        try {
          await adminDb.collection(COLLECTIONS.USERS).doc(userId).set(
            {
              photoURL: FieldValue.delete(),
              profilePic: '/logo.png',
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } catch (updateError) {
          const errorMsg = `Failed to update user profile: ${updateError}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        errors
      };

    } catch (err) {
      const errorMsg = `Failed to delete profile photo: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      
      return {
        success: false,
        errors
      };
    }
  }

  /**
   * Complete account deletion - deletes user and ALL associated data
   * Marks user as deleted so they can't be searched or messaged
   * Archives chats but keeps them for other users
   * WARNING: This is irreversible!
   */
  static async deleteAccountCompletely(userId: string): Promise<{
    success: boolean;
    deleted: {
      listings: number;
      profile: boolean;
      userDoc: boolean;
      profilePhoto: boolean;
      cart: boolean;
      chatsArchived: number;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const deleted = {
      listings: 0,
      profile: false,
      userDoc: false,
      profilePhoto: false,
      cart: false,
      chatsArchived: 0,
    };

    try {
      const adminDb = getAdminFirestore();
      
      // 1. Delete all listings (with photos)
      try {
        const userListingsSnap = await adminDb
          .collection(COLLECTIONS.LISTINGS)
          .where('sellerId', '==', userId)
          .get();
        const userListings = userListingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        
        for (const listing of userListings) {
          try {
            const listingId = (listing as { id?: string }).id;
            if (!listingId) {
              continue;
            }
            await this.deleteListingCompletely(listingId, userId);
            deleted.listings++;
          } catch (err) {
            const listingId = (listing as { id?: string }).id || 'unknown';
            const errorMsg = `Failed to delete listing ${listingId}: ${err instanceof Error ? err.message : 'Unknown error'}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      } catch (err) {
        const errorMsg = `Failed to fetch/delete listings: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // 2. Delete profile photo
      try {
        const photoResult = await this.deleteProfilePhotoCompletely(userId);
        deleted.profilePhoto = photoResult.success;
        if (!photoResult.success && photoResult.errors.length > 0) {
          errors.push(...photoResult.errors);
        }
      } catch (err) {
        const errorMsg = `Failed to delete profile photo: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('⚠️', errorMsg);
        errors.push(errorMsg);
      }

      // 3. Mark user as deleted (instead of deleting) - so they can't be searched
      // This preserves data integrity while preventing new interactions
      try {
        await adminDb.collection(COLLECTIONS.USERS).doc(userId).set({
          deleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        const errorMsg = `Failed to mark user as deleted: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // 4. Delete profile document (so they can't be found in searches)
      try {
        await adminDb.collection('profiles').doc(userId).delete();
        deleted.profile = true;
      } catch (err) {
        const errorMsg = `Failed to delete profile: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // 5. Delete cart
      try {
        await adminDb.collection(COLLECTIONS.CARTS).doc(userId).delete();
        deleted.cart = true;
      } catch (err) {
        const errorMsg = `Failed to delete cart: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // 6. Archive chats - mark user as deleted in chats but keep chat history
      try {
        const userChatsSnap = await adminDb
          .collection(COLLECTIONS.CHATS)
          .where('participants', 'array-contains', userId)
          .get();
        const userChats = userChatsSnap.docs.map((d) => ({ id: d.id }));
        
        for (const chat of userChats) {
          try {
            // Mark this user as deleted in the chat
            // This prevents new messages but keeps chat history
            await adminDb.collection(COLLECTIONS.CHATS).doc(chat.id).set({
              [`deletedParticipants.${userId}`]: true,
              [`deletedAt.${userId}`]: new Date().toISOString(),
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            deleted.chatsArchived++;
          } catch (err) {
            const errorMsg = `Failed to archive chat ${chat.id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      } catch (err) {
        const errorMsg = `Failed to archive chats: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // Note: We don't delete the user document completely - we mark it as deleted
      // This allows us to track that the account was deleted while preserving referential integrity
      deleted.userDoc = true;

      return {
        success: errors.length === 0,
        deleted,
        errors
      };

    } catch (err) {
      const errorMsg = `Account deletion failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      
      return {
        success: false,
        deleted,
        errors
      };
    }
  }
}
