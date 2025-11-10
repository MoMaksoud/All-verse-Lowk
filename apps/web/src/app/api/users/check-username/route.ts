import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { ProfileService } from '@/lib/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: NextRequest & { userId?: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    const isAvailable = await ProfileService.isUsernameAvailable(
      username,
      req.userId // Exclude current user's username when checking
    );

    return NextResponse.json({
      success: true,
      available: isAvailable,
      username: username.toLowerCase().trim().replace(/^@/, '').replace(/\s+/g, '')
    });
  } catch (error: any) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check username',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}, { requireAuth: false }); // Allow checking without auth (for signup)

