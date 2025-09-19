import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const currentUserId = request.headers.get('x-user-id');
    
    // Use requestedUserId if provided (for public profiles), otherwise use currentUserId
    const userId = requestedUserId || currentUserId;
    
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

    return NextResponse.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Profile update request:', { userId, body });
    
    // Check if profile exists
    const existingProfile = await ProfileService.getProfile(userId);
    
    let result;
    if (existingProfile) {
      // Update existing profile
      console.log('Updating existing profile');
      result = await ProfileService.updateProfile(userId, body);
    } else {
      // Create new profile
      console.log('Creating new profile');
      result = await ProfileService.saveProfile(userId, body);
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error updating/creating profile:', error);
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}