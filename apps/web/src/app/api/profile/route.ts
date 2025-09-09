import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { success, error } from '@/lib/response';
import { CreateProfileInput, ProfileSchema } from '@marketplace/types';
import { ProfileService } from '@/lib/firestore';
import { unauthorized, badRequest, notFound, internal } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest) => {
  try {
    const body = await req.json();
    
    // Get user ID from request body or headers
    const userId = body.userId || req.headers.get('x-user-id');
    if (!userId) {
      throw unauthorized('User ID required');
    }
    
    // Validate the profile data
    const validatedData = ProfileSchema.omit({
      userId: true,
      createdAt: true,
      updatedAt: true,
      rating: true,
    }).parse(body);

    // Create the profile with required fields
    const profileData = {
      ...validatedData,
      userId: userId,
      createdAt: new Date().toISOString(),
      rating: 0,
    };

    console.log('Profile data to save:', JSON.stringify(profileData, null, 2));

    // Save to Firestore
    const profile = await ProfileService.saveProfile(userId, profileData);
    
    console.log('Profile saved successfully:', JSON.stringify(profile, null, 2));

    return NextResponse.json(success(profile), { status: 201 });
  } catch (err: any) {
    console.error('Profile creation error:', err);
    
    if (err.name === 'ZodError') {
      throw badRequest('Invalid profile data');
    }

    throw internal('Failed to create profile');
  }
});

export const GET = withApi(async (req: NextRequest) => {
  try {
    // Get user ID from headers
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      throw unauthorized('User ID required');
    }

    // Get user profile
    const profile = await ProfileService.getProfile(userId);

    if (!profile) {
      throw notFound('Profile not found');
    }

    return NextResponse.json(success(profile));
  } catch (err: any) {
    console.error('Profile fetch error:', err);
    throw internal('Failed to fetch profile');
  }
});

export const PUT = withApi(async (req: NextRequest) => {
  try {
    // Get user ID from headers
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      throw unauthorized('User ID required');
    }

    const body = await req.json();
    
    // Validate the update data
    const validatedData = ProfileSchema.partial().omit({
      userId: true,
      createdAt: true,
    }).parse(body);

    // Add updatedAt timestamp
    const updateData = {
      ...validatedData,
      updatedAt: new Date().toISOString(),
    };

    // Update profile in Firestore
    const profile = await ProfileService.updateProfile(userId, updateData);

    return NextResponse.json(success(profile));
  } catch (err: any) {
    console.error('Profile update error:', err);
    
    if (err.name === 'ZodError') {
      throw badRequest('Invalid profile data');
    }

    throw internal('Failed to update profile');
  }
});