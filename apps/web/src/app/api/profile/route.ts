import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/firestore';
import { withApi } from '@/lib/withApi';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 15; // Cache for 15 seconds

export const GET = withApi(async (request: NextRequest & { userId?: string }) => {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    
    // Use requestedUserId if provided (for public profiles), otherwise use authenticated userId
    const userId = requestedUserId || request.userId;
    
    // Check if a token was provided but failed verification
    const authHeader = request.headers.get('authorization');
    const tokenProvided = authHeader && authHeader.startsWith('Bearer ');
    
    if (!userId) {
      // If a token was provided but userId is missing, it means auth failed - return 401
      if (tokenProvided) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid or expired authentication token' },
          { status: 401 }
        );
      }
      // Otherwise, return 400 for missing userId when no auth was attempted
      return NextResponse.json(
        { error: 'User ID is required. Please provide userId query parameter or authenticate.' },
        { status: 400 }
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