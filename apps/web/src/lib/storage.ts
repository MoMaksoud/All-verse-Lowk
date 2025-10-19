import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata, updateMetadata } from 'firebase/storage';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
  userId: string;
  userEmail: string;
  uploadedAt: string;
}

export interface UserMetadata {
  userId: string;
  userEmail: string;
  uploadedAt: string;
  listingId?: string;
  category?: string;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

class StorageService {
  // Upload a file to Firebase Storage with user tracking
  static async uploadFile(
    file: File,
    path: string,
    userMetadata: UserMetadata,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      console.log('📤 Uploading file with user tracking:', {
        userId: userMetadata.userId,
        userEmail: userMetadata.userEmail,
        path: path
      });

      // Create a reference to the file location
      const storageRef = ref(storage, path);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Get file metadata
      const metadata = await getMetadata(snapshot.ref);
      
      // Update metadata with user information
      const customMetadata = {
        userId: userMetadata.userId,
        userEmail: userMetadata.userEmail,
        uploadedAt: userMetadata.uploadedAt,
        listingId: userMetadata.listingId || '',
        category: userMetadata.category || '',
        originalFileName: file.name,
        fileSize: file.size.toString(),
        contentType: file.type
      };

      await updateMetadata(snapshot.ref, {
        customMetadata: customMetadata
      });

      console.log('✅ File uploaded successfully with user tracking:', {
        url: downloadURL,
        userId: userMetadata.userId,
        userEmail: userMetadata.userEmail
      });
      
      return {
        url: downloadURL,
        path: snapshot.ref.fullPath,
        size: metadata.size,
        type: metadata.contentType || file.type,
        userId: userMetadata.userId,
        userEmail: userMetadata.userEmail,
        uploadedAt: userMetadata.uploadedAt,
      };
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  // Upload profile picture
  static async uploadProfilePicture(
    file: File,
    userId: string,
    userEmail: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Profile picture must be an image file');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Profile picture must be smaller than 5MB');
    }

    // Generate unique filename using crypto.randomUUID() for better uniqueness
    const imageId = crypto.randomUUID();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${imageId}.${extension}`;
    const path = `users/${userId}/profile/${filename}`;

    const userMetadata: UserMetadata = {
      userId,
      userEmail,
      uploadedAt: new Date().toISOString(),
      category: 'profile-picture'
    };

    return this.uploadFile(file, path, userMetadata, onProgress);
  }

  // Upload listing photos
  static async uploadListingPhoto(
    file: File,
    userId: string,
    userEmail: string,
    listingId: string,
    photoIndex: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Listing photo must be an image file');
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Listing photo must be smaller than 10MB');
    }

    // Generate unique filename using crypto.randomUUID() for better uniqueness
    const imageId = crypto.randomUUID();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${imageId}.${extension}`;
    const path = `listing-photos/${userId}/${listingId}/${filename}`;

    const userMetadata: UserMetadata = {
      userId,
      userEmail,
      uploadedAt: new Date().toISOString(),
      listingId,
      category: 'listing-photo'
    };

    return this.uploadFile(file, path, userMetadata, onProgress);
  }

  // Upload listing videos
  static async uploadListingVideo(
    file: File,
    userId: string,
    userEmail: string,
    listingId: string,
    videoIndex: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      throw new Error('Listing video must be a video file');
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('Listing video must be smaller than 100MB');
    }

    // Generate unique filename using crypto.randomUUID() for better uniqueness
    const videoId = crypto.randomUUID();
    const extension = file.name.split('.').pop() || 'mp4';
    const filename = `${videoId}.${extension}`;
    const path = `users/${userId}/listings/${listingId}/videos/${filename}`;

    const userMetadata: UserMetadata = {
      userId,
      userEmail,
      uploadedAt: new Date().toISOString(),
      listingId,
      category: 'listing-video'
    };

    return this.uploadFile(file, path, userMetadata, onProgress);
  }

  // Upload chat attachments
  static async uploadChatAttachment(
    file: File,
    userId: string,
    userEmail: string,
    conversationId: string,
    messageId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Validate file type
    const allowedTypes = ['image/', 'video/', 'application/pdf', 'text/'];
    const isValidType = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isValidType) {
      throw new Error('File type not supported for chat attachments');
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('Chat attachment must be smaller than 25MB');
    }

    // Generate unique filename using crypto.randomUUID() for better uniqueness
    const attachmentId = crypto.randomUUID();
    const extension = file.name.split('.').pop() || 'bin';
    const filename = `${attachmentId}.${extension}`;
    const path = `users/${userId}/chats/${conversationId}/${filename}`;

    const userMetadata: UserMetadata = {
      userId,
      userEmail,
      uploadedAt: new Date().toISOString(),
      listingId: conversationId,
      category: 'chat-attachment'
    };

    return this.uploadFile(file, path, userMetadata, onProgress);
  }


  // Delete all photos for a specific listing
  static async deleteAllListingPhotos(userId: string, listingId: string): Promise<void> {
    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      const { listAll, ref } = await import('firebase/storage');
      const dirRef = ref(storage, `listing-photos/${userId}/${listingId}`);
      const res = await listAll(dirRef);
      
      // Delete all files in the directory
      await Promise.all(
        res.items.map(async (itemRef) => {
          try {
            await deleteObject(itemRef);
            console.log('✅ Deleted photo:', itemRef.fullPath);
          } catch (error) {
            console.error('Error deleting photo:', itemRef.fullPath, error);
          }
        })
      );
    } catch (error) {
      console.error('Error deleting all listing photos:', error);
      throw new Error(`Failed to delete all listing photos: ${error}`);
    }
  }


  // Delete a file from Firebase Storage
  static async deleteFile(path: string): Promise<void> {
    try {
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }


  // Validate file before upload
  static validateFile(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
  } = {}): { isValid: boolean; error?: string } {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = true } = options;

    if (required && !file) {
      return { isValid: false, error: 'File is required' };
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return { isValid: false, error: `File must be smaller than ${maxSizeMB}MB` };
    }

    if (allowedTypes.length > 0) {
      const isValidType = allowedTypes.some(type => file.type.startsWith(type));
      if (!isValidType) {
        return { isValid: false, error: `File type not supported. Allowed types: ${allowedTypes.join(', ')}` };
      }
    }

    return { isValid: true };
  }
}

export default StorageService;