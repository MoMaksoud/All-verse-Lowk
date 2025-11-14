import { getAdminStorage } from './firebase-admin';

export interface AdminUploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

export class AdminStorageService {
  static async uploadProfilePicture(
    file: File,
    userId: string,
    userEmail: string
  ): Promise<AdminUploadResult> {
    try {
      console.log('📤 Admin Storage: Starting profile picture upload...');
      const storage = getAdminStorage();
      const bucket = storage.bucket();
      
      // Generate unique filename
      const imageId = crypto.randomUUID();
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${imageId}.${extension}`;
      const path = `users/${userId}/profile/${filename}`;
      
      console.log('📤 Admin Storage: Uploading to path:', path);
      
      // Convert File to Buffer for server-side upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Upload to Firebase Storage using Admin SDK
      const fileRef = bucket.file(path);
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            userId,
            userEmail,
            uploadedAt: new Date().toISOString(),
            category: 'profile-picture',
            originalFileName: file.name,
            fileSize: file.size.toString(),
          },
        },
      });
      
      console.log('✅ Admin Storage: File saved, making public...');
      
      // Make the file publicly accessible
      await fileRef.makePublic();
      
      // Get the public URL
      const url = `https://storage.googleapis.com/${bucket.name}/${path}`;
      
      console.log('✅ Admin Storage: Upload complete, URL:', url);
      
      return {
        url,
        path: fileRef.name,
        size: file.size,
        type: file.type,
      };
    } catch (error: any) {
      console.error('❌ Admin Storage upload failed:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      throw new Error(`Failed to upload file: ${error?.message || 'Unknown error'}`);
    }
  }
}

