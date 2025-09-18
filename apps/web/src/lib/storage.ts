import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  UploadResult 
} from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';

export class StorageService {
  // Upload profile picture
  static async uploadProfilePicture(
    userId: string, 
    file: File
  ): Promise<string> {
    try {
      // Check if Firebase is configured
      if (!isFirebaseConfigured() || !storage) {
        // Fallback: Convert to data URL
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      
      // Create a reference to the file location
      const fileName = `profile-pictures/${userId}/${Date.now()}-${file.name}`;
      
      const storageRef = ref(storage, fileName);
      
      // Upload the file
      const uploadResult: UploadResult = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);
      // Fallback: Convert to data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }

  // Delete profile picture
  static async deleteProfilePicture(imageUrl: string): Promise<void> {
    try {
      // Extract the file path from the URL
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      // Don't throw error for deletion failures
    }
  }

  // Upload listing image
  static async uploadListingImage(
    listingId: string, 
    file: File,
    imageIndex: number = 0
  ): Promise<string> {
    try {
      // Check if Firebase is configured
      if (!isFirebaseConfigured() || !storage) {
        // Fallback: Convert to data URL
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const fileName = `listings/${listingId}/${imageIndex}-${Date.now()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      
      const uploadResult: UploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading listing image:', error);
      // Fallback: Convert to data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }

  // Upload multiple listing images
  static async uploadListingImages(
    listingId: string, 
    files: File[]
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map((file, index) => 
        this.uploadListingImage(listingId, file, index)
      );
      
      const downloadURLs = await Promise.all(uploadPromises);
      return downloadURLs;
    } catch (error) {
      console.error('Error uploading listing images:', error);
      throw new Error('Failed to upload listing images');
    }
  }

  // Validate file type and size
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Please upload a valid image file (JPEG, PNG, or WebP)' 
      };
    }
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: 'Image size must be less than 5MB' 
      };
    }
    
    return { valid: true };
  }
}
