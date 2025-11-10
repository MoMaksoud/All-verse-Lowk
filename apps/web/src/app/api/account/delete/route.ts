import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { FirebaseCleanupService } from '@/lib/firebaseCleanup';
import { getAdminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    if (!req.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    console.log('🗑️ Account deletion requested for user:', req.userId);

    // 1. Delete all Firestore data (listings, profile, cart, archive chats)
    const cleanupResult = await FirebaseCleanupService.deleteAccountCompletely(req.userId);
    
    if (!cleanupResult.success) {
      console.error('⚠️ Some cleanup operations failed:', cleanupResult.errors);
      // Continue with auth deletion even if some cleanup failed
    }

    // 2. Delete Firebase Auth user (requires Admin SDK)
    try {
      const adminAuth = getAdminAuth();
      await adminAuth.deleteUser(req.userId);
      console.log('✅ Firebase Auth user deleted');
    } catch (authError: any) {
      console.error('❌ Failed to delete Firebase Auth user:', authError);
      return NextResponse.json(
        { 
          error: 'Failed to delete account',
          details: authError?.message || 'Could not delete authentication account',
          cleanupResult: cleanupResult
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      deleted: cleanupResult.deleted,
      warnings: cleanupResult.errors.length > 0 ? cleanupResult.errors : undefined
    });

  } catch (error: any) {
    console.error('❌ Error deleting account:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete account',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
});

