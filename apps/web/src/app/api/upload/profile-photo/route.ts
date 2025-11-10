import { NextRequest, NextResponse } from 'next/server';
import StorageService from '@/lib/storage';
import { firestoreServices } from '@/lib/services/firestore';
import { ProfileService } from '@/lib/firestore';
import { ProfilePhotoUpload } from '@/lib/types/firestore';
import { FirebaseCleanupService } from '@/lib/firebaseCleanup';
import { withApi } from '@/lib/withApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {

    const formData = await req.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Photo file is required' }, { status: 400 });
    }

    // Validate file
    const validation = StorageService.validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/'],
      required: true
    });
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Upload photo to Firebase Storage
    const userEmail = req.headers.get('x-user-email') || 'unknown@example.com';
    const result = await StorageService.uploadProfilePicture(file, req.userId, userEmail);
    const photoUrl = result.url;
    
    // Extract file path from URL for tracking
    const url = new URL(photoUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    const photoPath = pathMatch ? decodeURIComponent(pathMatch[1]) : '';

    // Save photo metadata to Firestore
    const photoData: ProfilePhotoUpload = {
      userId: req.userId,
      photoUrl,
      photoPath,
      uploadedAt: new Date() as any, // Will be converted to Timestamp in service
    };

    await firestoreServices.profilePhotos.saveProfilePhoto(photoData);

    // Update user profile/user doc with new photo URL
    await firestoreServices.users.updateUser(req.userId, { photoURL: photoUrl });
    await ProfileService.saveProfile(req.userId, { profilePicture: photoUrl });

    return NextResponse.json({
      success: true,
      photoUrl,
      photoPath,
      message: 'Profile photo uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return NextResponse.json({ error: 'Failed to upload profile photo' }, { status: 500 });
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
