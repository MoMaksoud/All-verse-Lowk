import { NextRequest, NextResponse } from 'next/server';
import { AdminStorageService } from '@/lib/storage-admin';
import { saveProfilePhotoAdmin } from '@/lib/server/adminPhotos';
import { mergeProfileAdmin } from '@/lib/server/adminProfiles';
import { updateUserAdmin } from '@/lib/server/adminUsers';
import { ProfilePhotoUpload } from '@/lib/types/firestore';
import { FirebaseCleanupService } from '@/lib/firebaseCleanup';
import { withApi } from '@/lib/withApi';
import StorageService from '@/lib/storage';
import { serverLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    serverLogger.info('profile_photo_upload_start', { userId: req.userId });

    const formData = await req.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      serverLogger.warn('profile_photo_upload_missing_file', { userId: req.userId });
      return NextResponse.json({ error: 'Photo file is required' }, { status: 400 });
    }

    serverLogger.info('profile_photo_upload_file', {
      userId: req.userId,
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const validation = StorageService.validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedTypes: ['image/'],
      required: true,
    });
    if (!validation.isValid) {
      serverLogger.warn('profile_photo_upload_validation_failed', {
        userId: req.userId,
        error: validation.error,
      });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const userEmail = req.headers.get('x-user-email') || 'unknown@example.com';

    let result;
    try {
      result = await AdminStorageService.uploadProfilePicture(file, req.userId, userEmail);
      serverLogger.info('profile_photo_storage_ok', { userId: req.userId });
    } catch (uploadError: unknown) {
      const err = uploadError as { message?: string; code?: string; stack?: string };
      serverLogger.error('profile_photo_storage_failed', {
        userId: req.userId,
        message: err?.message,
        code: err?.code,
      });
      throw new Error(`Storage upload failed: ${err?.message || 'Unknown error'}`);
    }

    const photoPath = result.path;
    const photoUrl = result.url;

    try {
      // uploadedAt is overwritten by Admin save with serverTimestamp()
      await saveProfilePhotoAdmin({
        userId: req.userId,
        photoUrl,
        photoPath,
      } as ProfilePhotoUpload);
      serverLogger.info('profile_photo_metadata_saved', { userId: req.userId });
    } catch (firestoreError: unknown) {
      serverLogger.warn('profile_photo_metadata_failed', {
        userId: req.userId,
        error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
      });
    }

    try {
      await mergeProfileAdmin(req.userId, { profilePicture: photoPath });
      await updateUserAdmin(req.userId, {
        photoURL: photoUrl,
        profilePic: photoUrl,
      });
      serverLogger.info('profile_photo_profile_updated', { userId: req.userId });
    } catch (profileError: unknown) {
      serverLogger.warn('profile_photo_profile_update_failed', {
        userId: req.userId,
        error: profileError instanceof Error ? profileError.message : String(profileError),
      });
    }

    return NextResponse.json({
      success: true,
      photoUrl,
      photoPath,
      message: 'Profile photo uploaded successfully',
    });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; stack?: string; name?: string };
    serverLogger.error('profile_photo_upload_fatal', {
      userId: req.userId,
      message: err?.message,
      code: err?.code,
      name: err?.name,
    });

    const errorMessage = err?.message || 'Failed to upload profile photo';
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
      },
      { status: 500 }
    );
  }
});

export const DELETE = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const cleanupResult = await FirebaseCleanupService.deleteProfilePhotoCompletely(req.userId);

    if (cleanupResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Profile photo deleted successfully',
        warnings: cleanupResult.errors.length > 0 ? cleanupResult.errors : undefined,
      });
    }
    return NextResponse.json(
      {
        error: `Failed to delete profile photo: ${cleanupResult.errors.join(', ')}`,
      },
      { status: 500 }
    );
  } catch (error: unknown) {
    serverLogger.error('profile_photo_delete_failed', {
      userId: req.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to delete profile photo' }, { status: 500 });
  }
});
