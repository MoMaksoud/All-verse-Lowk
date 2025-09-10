import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { success, error } from '@/lib/response';
import { CreateProfileInput, ProfileSchema } from '@marketplace/types';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { unauthorized, badRequest, notFound, internal } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest) => {
  try {
    const body = await req.json();
    
    // Get user ID from request body or headers
    const userId = body.userId || req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User ID required' } }, { status: 401 });
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

    // Save to Firestore directly
    const profileRef = doc(db, 'profiles', userId);
    const profileToSave = {
      ...profileData,
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(profileRef, profileToSave, { merge: true });

    return NextResponse.json({ success: true, data: profileData }, { status: 201 });
  } catch (err: any) {
    console.error('Profile creation error:', err);
    
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid profile data' } }, { status: 400 });
    }

    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create profile' } }, { status: 500 });
  }
});

export const GET = withApi(async (req: NextRequest) => {
  try {
    // Get user ID from headers
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User ID required' } }, { status: 401 });
    }

    // Get user profile directly from Firestore
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Profile not found' } }, { status: 404 });
    }

    const profile = profileSnap.data();
    
    // Convert Firestore Timestamps to ISO strings for JSON serialization
    const serializedProfile = {
      ...profile,
      updatedAt: profile.updatedAt?.toDate?.()?.toISOString() || profile.updatedAt,
      createdAt: profile.createdAt?.toDate?.()?.toISOString() || profile.createdAt,
    };
    
    return NextResponse.json({ success: true, data: serializedProfile });
  } catch (err: any) {
    console.error('Profile fetch error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch profile' } }, { status: 500 });
  }
});

export const PUT = withApi(async (req: NextRequest) => {
  try {
    const body = await req.json();
    console.log('PUT request body:', body);
    
    // Get user ID from headers
    const userId = req.headers.get('x-user-id');
    console.log('User ID:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User ID required' } }, { status: 401 });
    }

    // Validate the update data
    let validatedData;
    try {
      validatedData = ProfileSchema.partial().omit({
        userId: true,
        createdAt: true,
        rating: true,
      }).parse(body);
      console.log('Validation successful:', validatedData);
    } catch (validationError: any) {
      console.error('Validation error:', validationError);
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid profile data: ' + validationError.message } }, { status: 400 });
    }

    // Add updatedAt timestamp
    const updateData = {
      ...validatedData,
      updatedAt: serverTimestamp(),
    };

    // Update profile in Firestore directly
    const profileRef = doc(db, 'profiles', userId);
    await setDoc(profileRef, updateData, { merge: true });

    // Return the updated profile data
    const updatedProfile = {
      ...validatedData,
      userId: userId,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (err: any) {
    console.error('Profile update error:', err);
    
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid profile data' } }, { status: 400 });
    }

    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update profile' } }, { status: 500 });
  }
});