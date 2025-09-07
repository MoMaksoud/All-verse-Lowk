import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/firestore';

// Helper function to get user ID from request
// For now, we'll use a simple approach that works with client-side auth
function getUserIdFromRequest(request: NextRequest): string {
  // In a real production app, you'd verify the Firebase token here
  // For development, we'll use a consistent approach
  
  // Check if there's a user ID in the request body or headers
  const userId = request.headers.get('x-user-id');
  
  if (userId) {
    return userId;
  }
  
  // For development, return a default user ID
  // This will be replaced with actual Firebase UID in the frontend
  return 'default-user-id';
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    let profile = await ProfileService.getProfile(userId);
    
    if (!profile) {
      // Create a default profile if none exists
      profile = await ProfileService.saveProfile(userId, {
        bio: '',
        location: '',
        rating: 0,
      });
    }
    
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = getUserIdFromRequest(request);
    
    const updatedProfile = await ProfileService.saveProfile(userId, body);
    
    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
