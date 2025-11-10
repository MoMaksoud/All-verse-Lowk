import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/firestore';
import { withApi } from '@/lib/withApi';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

export const GET = withApi(async (request: NextRequest & { userId?: string }) => {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    
    // Use requestedUserId if provided (for public profiles), otherwise use authenticated userId
    const userId = requestedUserId || request.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const profile = await ProfileService.getProfile(userId);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: profile
    });

    // Add caching headers for public profiles
    if (requestedUserId) {
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    } else {
      response.headers.set('Cache-Control', 'private, max-age=60');
    }

    return response;

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}, { requireAuth: false }); // Allow public profile viewing

export const PUT = withApi(async (request: NextRequest & { userId: string }) => {
  try {
    if (!request.userId) {
      console.error('❌ No userId in request');
      return NextResponse.json(
        { error: 'User ID is required', details: 'Authentication failed' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('✅ Profile update request:', { userId: request.userId, bodyKeys: Object.keys(body) });
    
    // Use saveProfile for both create and update (it uses setDoc with merge: true)
    // This is safer than updateProfile which fails if document doesn't exist
    const result = await ProfileService.saveProfile(request.userId, body);
    
    console.log('✅ Profile saved successfully');
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('❌ Error updating/creating profile:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error name:', error?.name);
    return NextResponse.json(
      { 
        error: 'Failed to update profile', 
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
});