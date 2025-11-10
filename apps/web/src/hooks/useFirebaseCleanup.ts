import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for handling Firebase cleanup operations on the client side
 * Provides loading states and error handling for deletion operations
 */
export function useFirebaseCleanup() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();
  const { currentUser } = useAuth();

  /**
   * Delete a listing and handle the response
   * @param listingId - The ID of the listing to delete
   * @param onSuccess - Optional callback for successful deletion
   * @param onError - Optional callback for deletion errors
   */
  const deleteListing = async (
    listingId: string, 
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    if (!currentUser?.uid) {
      showError('Authentication Required', 'You must be signed in to delete listings');
      return;
    }

    setIsDeleting(true);
    
    try {
      const { apiDelete } = await import('@/lib/api-client');
      const response = await apiDelete(`/api/listings/${listingId}`);

      if (response.ok) {
        const result = await response.json();
        
        // Show success message with details
        if (result.data?.deletedPhotos > 0) {
          showSuccess(
            'Listing Deleted', 
            `Your listing and ${result.data.deletedPhotos} photo(s) have been successfully deleted`
          );
        } else {
          showSuccess('Listing Deleted', 'Your listing has been successfully deleted');
        }

        // Show warnings if any
        if (result.data?.warnings && Array.isArray(result.data.warnings) && result.data.warnings.length > 0) {
          showWarning(
            'Cleanup Warnings', 
            `Some cleanup operations had issues: ${result.data.warnings.join(', ')}`
          );
        }

        onSuccess?.();
      } else {
        const errorData = await response.json();
        const errorMessage = typeof errorData.error === 'string' ? errorData.error : 'Failed to delete listing';
        showError('Delete Failed', errorMessage);
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = 'An error occurred while deleting the listing';
      console.error('Error deleting listing:', error);
      showError('Delete Failed', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Delete a profile photo and handle the response
   * @param onSuccess - Optional callback for successful deletion
   * @param onError - Optional callback for deletion errors
   */
  const deleteProfilePhoto = async (
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    if (!currentUser?.uid) {
      showError('Authentication Required', 'You must be signed in to delete profile photos');
      return;
    }

    setIsDeleting(true);
    
    try {
      const { apiDelete } = await import('@/lib/api-client');
      const response = await apiDelete('/api/upload/profile-photo');

      if (response.ok) {
        const result = await response.json();
        
        showSuccess('Profile Photo Deleted', 'Your profile photo has been successfully deleted');

        // Show warnings if any
        if (result.warnings && Array.isArray(result.warnings) && result.warnings.length > 0) {
          showWarning(
            'Cleanup Warnings', 
            `Some cleanup operations had issues: ${result.warnings.join(', ')}`
          );
        }

        onSuccess?.();
      } else {
        const errorData = await response.json();
        const errorMessage = typeof errorData.error === 'string' ? errorData.error : 'Failed to delete profile photo';
        showError('Delete Failed', errorMessage);
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = 'An error occurred while deleting the profile photo';
      console.error('Error deleting profile photo:', error);
      showError('Delete Failed', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    deleteListing,
    deleteProfilePhoto,
  };
}
