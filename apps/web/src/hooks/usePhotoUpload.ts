import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PhotoUploadState {
  uploading: boolean;
  error: string | null;
  progress: number;
}

interface PhotoUploadResult {
  url: string;
  path: string;
}

export const usePhotoUpload = () => {
  const { currentUser } = useAuth();
  const [state, setState] = useState<PhotoUploadState>({
    uploading: false,
    error: null,
    progress: 0,
  });

  const uploadProfilePhoto = useCallback(async (file: File): Promise<PhotoUploadResult | null> => {
    if (!currentUser) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return null;
    }

    setState({ uploading: true, error: null, progress: 0 });

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/upload/profile-photo', {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.uid,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setState({ uploading: false, error: null, progress: 100 });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState({ uploading: false, error: errorMessage, progress: 0 });
      return null;
    }
  }, [currentUser]);

  const uploadListingPhotos = useCallback(async (
    listingId: string, 
    files: File[]
  ): Promise<PhotoUploadResult[] | null> => {
    if (!currentUser) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return null;
    }

    setState({ uploading: true, error: null, progress: 0 });

    try {
      const formData = new FormData();
      formData.append('listingId', listingId);
      files.forEach(file => formData.append('photos', file));

      const response = await fetch('/api/upload/listing-photos', {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.uid,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setState({ uploading: false, error: null, progress: 100 });
      return result.photoUrls.map((url: string, index: number) => ({
        url,
        path: result.photoPaths[index],
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState({ uploading: false, error: errorMessage, progress: 0 });
      return null;
    }
  }, [currentUser]);

  const deleteProfilePhoto = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return false;
    }

    setState(prev => ({ ...prev, uploading: true, error: null }));

    try {
      const response = await fetch('/api/upload/profile-photo', {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.uid,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      setState(prev => ({ ...prev, uploading: false, error: null }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      setState(prev => ({ ...prev, uploading: false, error: errorMessage }));
      return false;
    }
  }, [currentUser]);

  const deleteListingPhotos = useCallback(async (listingId: string): Promise<boolean> => {
    if (!currentUser) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return false;
    }

    setState(prev => ({ ...prev, uploading: true, error: null }));

    try {
      const response = await fetch(`/api/upload/listing-photos?listingId=${listingId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.uid,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      setState(prev => ({ ...prev, uploading: false, error: null }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      setState(prev => ({ ...prev, uploading: false, error: errorMessage }));
      return false;
    }
  }, [currentUser]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    uploadProfilePhoto,
    uploadListingPhotos,
    deleteProfilePhoto,
    deleteListingPhotos,
    clearError,
  };
};
