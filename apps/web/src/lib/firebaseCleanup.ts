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
   * Clean up orphaned files from Firebase Storage
   * This can be used for maintenance tasks
   * @param userId - The ID of the user (optional, for user-specific cleanup)
   * @returns Promise with cleanup results
   */
  static async cleanupOrphanedFiles(userId?: string): Promise<{
    success: boolean;
    deletedFiles: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedFiles = 0;

    try {
      console.log('🧹 Starting orphaned files cleanup...');
      
      // This would require implementing a more sophisticated cleanup logic
      // For now, we'll just log that this feature is available
      console.log('⚠️ Orphaned files cleanup not yet implemented');
      
      return {
        success: true,
        deletedFiles,
        errors
      };

    } catch (err) {
      const errorMsg = `Failed to cleanup orphaned files: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('❌ Error:', errorMsg);
      errors.push(errorMsg);
      
      return {
        success: false,
        deletedFiles,
        errors
      };
    }
  }
}
