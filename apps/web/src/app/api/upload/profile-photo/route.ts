import { NextRequest, NextResponse } from 'next/server';
import { AdminStorageService } from '@/lib/storage-admin';
import { firestoreServices } from '@/lib/services/firestore';
import { ProfileService } from '@/lib/firestore';
import { ProfilePhotoUpload } from '@/lib/types/firestore';
import { FirebaseCleanupService } from '@/lib/firebaseCleanup';
import { withApi } from '@/lib/withApi';
import StorageService from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    console.log('📸 Profile photo upload request received for user:', req.userId);

    const formData = await req.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      console.error('❌ No photo file provided');
      return NextResponse.json({ error: 'Photo file is required' }, { status: 400 });
    }

    console.log('📸 File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file
    const validation = StorageService.validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/'],
      required: true
    });
    if (!validation.isValid) {
      console.error('❌ File validation failed:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Upload photo to Firebase Storage using Admin SDK (bypasses security rules)
    const userEmail = req.headers.get('x-user-email') || 'unknown@example.com';
    console.log('📸 Starting upload to Firebase Storage using Admin SDK...');
    
    let result;
    try {
      // Use Admin Storage Service for server-side uploads (bypasses security rules)
      result = await AdminStorageService.uploadProfilePicture(file, req.userId, userEmail);
      console.log('✅ File uploaded to Storage via Admin SDK, URL:', result.url);
    } catch (uploadError: any) {
      console.error('❌ Firebase Storage upload failed:', uploadError);
      console.error('❌ Upload error details:', {
        message: uploadError?.message,
        code: uploadError?.code,
        stack: uploadError?.stack
      });
      throw new Error(`Storage upload failed: ${uploadError?.message || 'Unknown error'}`);
    }
    
    // Use storage path as the source of truth (not URL)
    const photoPath = result.path; // Storage path: users/{userId}/profile/{filename}
    
    // Generate URL from path for response (but don't store URL in profile)
    const photoUrl = result.url;

    // Save photo metadata to Firestore
    try {
      const photoData: ProfilePhotoUpload = {
        userId: req.userId,
        photoUrl, // Keep URL for metadata/backwards compatibility
        photoPath, // Store path as primary reference
        uploadedAt: new Date() as any, // Will be converted to Timestamp in service
      };

      await firestoreServices.profilePhotos.saveProfilePhoto(photoData);
      console.log('✅ Photo metadata saved to Firestore');
    } catch (firestoreError: any) {
      console.error('❌ Failed to save photo metadata:', firestoreError);
      // Don't fail the whole request if metadata save fails - the photo is already uploaded
    }

    // Update user profile/user doc with storage PATH (not URL) as source of truth
    try {
      // Store path in profile - this is the single source of truth
      await ProfileService.saveProfile(req.userId, { profilePicture: photoPath });
      // Also update users collection profilePic field (for non-Google users or as fallback)
      await firestoreServices.users.updateUser(req.userId, { 
        photoURL: photoUrl,
        profilePic: photoUrl, // Store URL in users collection for consistency
      });
      console.log('✅ User profile updated with storage path:', photoPath);
    } catch (profileError: any) {
      console.error('❌ Failed to update user profile:', profileError);
      // Don't fail the whole request if profile update fails - the photo is already uploaded
    }

    return NextResponse.json({
      success: true,
      photoUrl,
      photoPath,
      message: 'Profile photo uploaded successfully',
    });
  } catch (error: any) {
    console.error('❌ Error uploading profile photo:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name
    });
    
    const errorMessage = error?.message || 'Failed to upload profile photo';
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
});

export const DELETE = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    // Use the comprehensive cleanup service
    const cleanupResult = await FirebaseCleanupService.deleteProfilePhotoCompletely(req.userId);
    
    if (cleanupResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Profile photo deleted successfully',
        warnings: cleanupResult.errors.length > 0 ? cleanupResult.errors : undefined
      });
    } else {
      return NextResponse.json({ 
        error: `Failed to delete profile photo: ${cleanupResult.errors.join(', ')}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    return NextResponse.json({ error: 'Failed to delete profile photo' }, { status: 500 });
  }
});
