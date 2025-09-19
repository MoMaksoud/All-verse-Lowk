import { useState, useCallback } from 'react';
import StorageService, { UploadResult, UploadProgress } from '@/lib/storage';

interface UseFileUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: UploadProgress) => void;
}

interface UseFileUploadReturn {
  uploadFile: (file: File, path: string, userId: string, userEmail: string) => Promise<UploadResult | null>;
  uploadProfilePicture: (file: File, userId: string, userEmail: string) => Promise<UploadResult | null>;
  uploadListingPhoto: (file: File, userId: string, userEmail: string, listingId: string, photoIndex: number) => Promise<UploadResult | null>;
  uploadListingVideo: (file: File, userId: string, userEmail: string, listingId: string, videoIndex: number) => Promise<UploadResult | null>;
  uploadChatAttachment: (file: File, userId: string, userEmail: string, conversationId: string, messageId: string) => Promise<UploadResult | null>;
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  clearError: () => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { onSuccess, onError, onProgress } = options;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleProgress = useCallback((uploadProgress: UploadProgress) => {
    setProgress(uploadProgress);
    onProgress?.(uploadProgress);
  }, [onProgress]);

  const handleSuccess = useCallback((result: UploadResult) => {
    setProgress(null);
    onSuccess?.(result);
  }, [onSuccess]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setProgress(null);
    onError?.(errorMessage);
  }, [onError]);

  const uploadFile = useCallback(async (file: File, path: string, userId: string, userEmail: string): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setError(null);
      
      const userMetadata = {
        userId,
        userEmail,
        uploadedAt: new Date().toISOString(),
        category: 'custom'
      };
      
      const result = await StorageService.uploadFile(file, path, userMetadata, handleProgress);
      handleSuccess(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      handleError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [handleProgress, handleSuccess, handleError]);

  const uploadProfilePicture = useCallback(async (file: File, userId: string, userEmail: string): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setError(null);
      
      const result = await StorageService.uploadProfilePicture(file, userId, userEmail, handleProgress);
      handleSuccess(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Profile picture upload failed';
      handleError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [handleProgress, handleSuccess, handleError]);

  const uploadListingPhoto = useCallback(async (file: File, userId: string, userEmail: string, listingId: string, photoIndex: number): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setError(null);
      
      const result = await StorageService.uploadListingPhoto(file, userId, userEmail, listingId, photoIndex, handleProgress);
      handleSuccess(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Listing photo upload failed';
      handleError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [handleProgress, handleSuccess, handleError]);

  const uploadListingVideo = useCallback(async (file: File, userId: string, userEmail: string, listingId: string, videoIndex: number): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setError(null);
      
      const result = await StorageService.uploadListingVideo(file, userId, userEmail, listingId, videoIndex, handleProgress);
      handleSuccess(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Listing video upload failed';
      handleError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [handleProgress, handleSuccess, handleError]);

  const uploadChatAttachment = useCallback(async (file: File, userId: string, userEmail: string, conversationId: string, messageId: string): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setError(null);
      
      const result = await StorageService.uploadChatAttachment(file, userId, userEmail, conversationId, messageId, handleProgress);
      handleSuccess(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Chat attachment upload failed';
      handleError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [handleProgress, handleSuccess, handleError]);

  return {
    uploadFile,
    uploadProfilePicture,
    uploadListingPhoto,
    uploadListingVideo,
    uploadChatAttachment,
    isUploading,
    progress,
    error,
    clearError,
  };
}
