import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { firestoreServices } from '@/lib/services/firestore';
import { ProfilePhotoUpload } from '@/lib/types/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Photo file is required' }, { status: 400 });
    }

    // Validate file
    const validation = StorageService.validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Upload photo to Firebase Storage
    const photoUrl = await StorageService.uploadProfilePicture(userId, file);
    
    // Extract file path from URL for tracking
    const url = new URL(photoUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    const photoPath = pathMatch ? decodeURIComponent(pathMatch[1]) : '';

    // Save photo metadata to Firestore
    const photoData: ProfilePhotoUpload = {
      userId,
      photoUrl,
      photoPath,
      uploadedAt: new Date() as any, // Will be converted to Timestamp in service
    };

    await firestoreServices.profilePhotos.saveProfilePhoto(photoData);

    // Update user profile with new photo URL
    await firestoreServices.users.updateUser(userId, {
      photoURL: photoUrl,
    });

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
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    // Get current profile photo
    const photoData = await firestoreServices.profilePhotos.getProfilePhoto(userId);
    
    if (photoData) {
      // Delete from Firebase Storage
      await StorageService.deleteProfilePicture(photoData.photoUrl);
      
      // Delete from Firestore
      await firestoreServices.profilePhotos.deleteProfilePhoto(userId);
      
      // Update user profile to remove photo URL
      await firestoreServices.users.updateUser(userId, {
        photoURL: undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile photo deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    return NextResponse.json({ error: 'Failed to delete profile photo' }, { status: 500 });
  }
}
