import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getProfileDocumentAdmin, saveProfileAdmin } from '@/lib/server/adminProfiles';
import { ensureUserDocMinimalAdmin } from '@/lib/server/adminUsers';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 15; // Cache for 15 seconds

export const GET = withApi(async (request: NextRequest & { userId?: string }) => {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const userId = requestedUserId || request.userId;

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
      profile = await getProfileDocumentAdmin(userId);
    } catch (error) {
      console.error('Profile API: Error fetching profile from database:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch profile',
          message: 'An error occurred while fetching the profile. Please try again later.'
        },
        { status: 500 }
      );
    }

    if (!profile) {
      try {
        await ensureUserDocMinimalAdmin(userId);
      } catch {
        // Silent fail - not critical
      }

      return NextResponse.json({
        success: true,
        data: null
      }, { status: 200 });
    }

    const serializedProfile = {
      ...profile,
      createdAt: profile.createdAt?.toDate?.()?.toISOString() || (typeof profile.createdAt === 'string' ? profile.createdAt : new Date().toISOString()),
      updatedAt: profile.updatedAt?.toDate?.()?.toISOString() || (typeof profile.updatedAt === 'string' ? profile.updatedAt : undefined),
    };

    const response = NextResponse.json({
      success: true,
      data: serializedProfile
    }, { status: 200 });

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
}, { requireAuth: false });

export const PUT = withApi(async (request: NextRequest & { userId: string }) => {
  try {
    if (!request.userId) {
      return NextResponse.json(
        { error: 'User ID is required', details: 'Authentication failed' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const cleanedBody: Record<string, unknown> = {};
    Object.keys(body).forEach(key => {
      const value = body[key];

      if (value === undefined || value === null) {
        return;
      }

      if (key === 'budget' && typeof value === 'object' && !Array.isArray(value)) {
        const budget: Record<string, unknown> = {};
        const b = value as Record<string, unknown>;
        if (b.min !== undefined && b.min !== null && b.min !== '') budget.min = b.min;
        if (b.max !== undefined && b.max !== null && b.max !== '') budget.max = b.max;
        if (b.currency) budget.currency = b.currency;
        if (Object.keys(budget).length > 0) {
          cleanedBody[key] = budget;
        }
      } else {
        cleanedBody[key] = value;
      }
    });

    const result = await saveProfileAdmin(request.userId, cleanedBody as Parameters<typeof saveProfileAdmin>[1]);
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: unknown) {
    console.error('Error updating/creating profile:', error);
    const message = error instanceof Error ? error.message : '';

    if (message.includes('username') || message.includes('taken')) {
      return NextResponse.json(
        {
          error: 'Username unavailable',
          details: message || 'This username is already taken'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update profile',
        details: message || 'Unknown error'
      },
      { status: 500 }
    );
  }
});
