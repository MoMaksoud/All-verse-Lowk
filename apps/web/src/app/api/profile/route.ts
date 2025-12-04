import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/firestore';
import { withApi } from '@/lib/withApi';
import { firestoreServices } from '@/lib/services/firestore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 15; // Cache for 15 seconds

export const GET = withApi(async (request: NextRequest & { userId?: string }) => {
  try {
    const { searchParams } = new URL(request.url);
    // Read seller ID from query param userId
    const requestedUserId = searchParams.get('userId');
    
    // Use requestedUserId if provided (for public profiles), otherwise use authenticated userId
    const userId = requestedUserId || request.userId;
    
    // Validate userId - return 400 if missing
    if (!userId || (typeof userId === 'string' && userId.trim().length === 0)) {
      return NextResponse.json(
        { 
          error: 'UserId missing but handled'
        },
        { status: 400 }
      );
    }

    let profile;
    try {
      profile = await ProfileService.getProfile(userId);
    } catch (error) {
      // Log error and return handled JSON error message instead of throwing
      console.error('Profile API: Error fetching profile from database:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch profile',
          message: 'An error occurred while fetching the profile. Please try again later.'
        },
        { status: 500 }
      );
    }
    
    // If user is not found, create placeholder user doc and return 404 (expected behavior)
    if (!profile) {
      // Silently handle - 404 is expected for users without profiles
      // Ensure user document exists in users collection with default avatar
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, { 
            profilePic: '/default-avatar.png' 
          }, { merge: true });
        }
      } catch (userDocError) {
        // Silent fail - this is not critical
      }
      
      return NextResponse.json(
        { 
          error: 'Profile not found',
          userId: userId
        },
        { status: 404 }
      );
    }

    // Serialize Firestore Timestamps to ISO strings
    const serializedProfile = {
      ...profile,
      createdAt: profile.createdAt?.toDate?.()?.toISOString() || (typeof profile.createdAt === 'string' ? profile.createdAt : new Date().toISOString()),
      updatedAt: profile.updatedAt?.toDate?.()?.toISOString() || (typeof profile.updatedAt === 'string' ? profile.updatedAt : undefined),
    };

    // Return 200 with profile data
    const response = NextResponse.json({
      success: true,
      data: serializedProfile
    }, { status: 200 });

    // Add caching headers for public profiles
    if (requestedUserId) {
      response.headers.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
    } else {
      response.headers.set('Cache-Control', 'private, max-age=10');
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
      return NextResponse.json(
        { error: 'User ID is required', details: 'Authentication failed' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Clean up undefined/null values and ensure proper structure
    const cleanedBody: any = {};
    Object.keys(body).forEach(key => {
      const value = body[key];
      
      // Skip undefined and null values
      if (value === undefined || value === null) {
        return;
      }
      
      // Handle budget object - only include if it has valid values
      if (key === 'budget' && typeof value === 'object' && !Array.isArray(value)) {
        const budget: any = {};
        if (value.min !== undefined && value.min !== null && value.min !== '') budget.min = value.min;
        if (value.max !== undefined && value.max !== null && value.max !== '') budget.max = value.max;
        if (value.currency) budget.currency = value.currency;
        if (Object.keys(budget).length > 0) {
          cleanedBody[key] = budget;
        }
      } 
      // Include all other valid values (arrays, strings, numbers, booleans, etc.)
      else {
        cleanedBody[key] = value;
      }
    });
    
    const result = await ProfileService.saveProfile(request.userId, cleanedBody);
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error updating/creating profile:', error);
    
    // Check if it's a username conflict error
    if (error?.message?.includes('username') || error?.message?.includes('taken')) {
      return NextResponse.json(
        { 
          error: 'Username unavailable', 
          details: error?.message || 'This username is already taken'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update profile', 
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
});