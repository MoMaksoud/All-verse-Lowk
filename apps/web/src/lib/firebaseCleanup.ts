import StorageService from '@/lib/storage';

// Import firestore services dynamically to avoid webpack issues
async function getFirestoreServices() {
  try {
    const { firestoreServices } = await import('@/lib/services/firestore');
    return firestoreServices;
  } catch (err) {
    console.error('Failed to import firestore services:', err);
    throw new Error('Database services not available');
  }
}

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
      console.log('🔧 Loading firestore services...');
      const firestoreServices = await getFirestoreServices();
      console.log('✅ Firestore services loaded successfully');
      
      // Get the existing listing to check ownership and get photo URLs
      console.log('🔍 Fetching listing:', listingId);
      const existingListing = await firestoreServices.listings.getListing(listingId);
      if (!existingListing) {
        throw new Error('Listing not found');
      }
      console.log('✅ Listing found:', existingListing.title);

      // Check if user owns this listing
      if (existingListing.sellerId !== userId) {
        throw new Error('You can only delete your own listings');
      }
      console.log('✅ Ownership verified');

      console.log('🗑️ Starting comprehensive deletion process for listing:', listingId);
      console.log('📸 Listing photos to clean up:', existingListing.images?.length || 0);

      // 1. Delete all photos from Firebase Storage
      try {
        if (existingListing.images && existingListing.images.length > 0) {
          console.log('🗑️ Deleting photos from Firebase Storage...');
          await StorageService.deleteAllListingPhotos(userId, listingId);
          deletedPhotos = existingListing.images.length;
          console.log('✅ Successfully deleted all photos from Firebase Storage');
        }
      } catch (storageError) {
        const errorMsg = `Failed to delete photos from Firebase Storage: ${storageError}`;
        console.error('⚠️ Warning:', errorMsg);
        errors.push(errorMsg);
        // Continue with Firestore deletion even if storage cleanup fails
      }

      // 2. Delete any photo metadata from Firestore
      try {
        console.log('🗑️ Deleting photo metadata from Firestore...');
        await firestoreServices.listingPhotos.deleteListingPhotos(listingId);
        console.log('✅ Successfully deleted photo metadata from Firestore');
      } catch (photoMetadataError) {
        const errorMsg = `Failed to delete photo metadata: ${photoMetadataError}`;
        console.error('⚠️ Warning:', errorMsg);
        errors.push(errorMsg);
        // Continue with listing deletion even if photo metadata cleanup fails
      }

      // 3. Delete the listing from Firestore
      console.log('🗑️ Deleting listing from Firestore...');
      await firestoreServices.listings.deleteListing(listingId);
      console.log('✅ Successfully deleted listing from Firestore');

      return {
        success: true,
        deletedPhotos,
        errors
      };

    } catch (err) {
      const errorMsg = `Failed to delete listing: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('❌ Error:', errorMsg);
      console.error('❌ Full error object:', err);
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
      const firestoreServices = await getFirestoreServices();
      
      // Get current profile photo
      const photoData = await firestoreServices.profilePhotos.getProfilePhoto(userId);
      
      if (photoData) {
        // Delete from Firebase Storage
        try {
          await StorageService.deleteFile(photoData.photoUrl);
          console.log('✅ Successfully deleted profile photo from Firebase Storage');
        } catch (storageError) {
          const errorMsg = `Failed to delete profile photo from Firebase Storage: ${storageError}`;
          console.error('⚠️ Warning:', errorMsg);
          errors.push(errorMsg);
        }
        
        // Delete from Firestore
        try {
          await firestoreServices.profilePhotos.deleteProfilePhoto(userId);
          console.log('✅ Successfully deleted profile photo metadata from Firestore');
        } catch (firestoreError) {
          const errorMsg = `Failed to delete profile photo metadata: ${firestoreError}`;
          console.error('⚠️ Warning:', errorMsg);
          errors.push(errorMsg);
        }
        
        // Update user profile to remove photo URL
        try {
          await firestoreServices.users.updateUser(userId, {
            photoURL: undefined,
          });
          console.log('✅ Successfully updated user profile');
        } catch (updateError) {
          const errorMsg = `Failed to update user profile: ${updateError}`;
          console.error('⚠️ Warning:', errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        errors
      };

    } catch (err) {
      const errorMsg = `Failed to delete profile photo: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('❌ Error:', errorMsg);
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
      console.log('🗑️ Starting complete account deletion for user:', userId);
      const firestoreServices = await getFirestoreServices();
      
      // 1. Delete all listings (with photos)
      try {
        const userListings = await firestoreServices.listings.getListingsBySeller(userId);
        console.log(`📦 Found ${userListings.length} listings to delete`);
        
        for (const listing of userListings) {
          try {
            const listingId = (listing as any).id;
            if (!listingId) {
              console.warn('⚠️ Listing missing ID, skipping:', listing);
              continue;
            }
            await this.deleteListingCompletely(listingId, userId);
            deleted.listings++;
          } catch (err) {
            const listingId = (listing as any).id || 'unknown';
            const errorMsg = `Failed to delete listing ${listingId}: ${err instanceof Error ? err.message : 'Unknown error'}`;
            console.error('⚠️', errorMsg);
            errors.push(errorMsg);
          }
        }
        console.log(`✅ Deleted ${deleted.listings} listings`);
      } catch (err) {
        const errorMsg = `Failed to fetch/delete listings: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('⚠️', errorMsg);
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
        await firestoreServices.users.updateUser(userId, {
          deleted: true,
          deletedAt: new Date().toISOString(),
        } as any);
        console.log('✅ Marked user as deleted');
      } catch (err) {
        const errorMsg = `Failed to mark user as deleted: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('⚠️', errorMsg);
        errors.push(errorMsg);
      }

      // 4. Delete profile document (so they can't be found in searches)
      try {
        const { ProfileService } = await import('@/lib/firestore');
        await ProfileService.deleteProfile(userId);
        deleted.profile = true;
        console.log('✅ Deleted profile document');
      } catch (err) {
        const errorMsg = `Failed to delete profile: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('⚠️', errorMsg);
        errors.push(errorMsg);
      }

      // 5. Delete cart
      try {
        await firestoreServices.carts.deleteCart(userId);
        deleted.cart = true;
        console.log('✅ Deleted cart');
      } catch (err) {
        const errorMsg = `Failed to delete cart: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('⚠️', errorMsg);
        errors.push(errorMsg);
      }

      // 6. Archive chats - mark user as deleted in chats but keep chat history
      try {
        const userChats = await firestoreServices.chats.getUserChats(userId);
        console.log(`💬 Found ${userChats.length} chats to archive`);
        
        for (const chat of userChats) {
          try {
            // Mark this user as deleted in the chat
            // This prevents new messages but keeps chat history
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            const chatRef = doc(db, 'chats', chat.id);
            await updateDoc(chatRef, {
              [`deletedParticipants.${userId}`]: true,
              [`deletedAt.${userId}`]: new Date().toISOString(),
            } as any);
            deleted.chatsArchived++;
          } catch (err) {
            const errorMsg = `Failed to archive chat ${chat.id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
            console.error('⚠️', errorMsg);
            errors.push(errorMsg);
          }
        }
        console.log(`✅ Archived ${deleted.chatsArchived} chats`);
      } catch (err) {
        const errorMsg = `Failed to archive chats: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('⚠️', errorMsg);
        errors.push(errorMsg);
      }

      // Note: We don't delete the user document completely - we mark it as deleted
      // This allows us to track that the account was deleted while preserving referential integrity
      deleted.userDoc = true;

      console.log('✅ Account deletion process completed');
      return {
        success: errors.length === 0,
        deleted,
        errors
      };

    } catch (err) {
      const errorMsg = `Account deletion failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('❌', errorMsg);
      errors.push(errorMsg);
      
      return {
        success: false,
        deleted,
        errors
      };
    }
  }
}
