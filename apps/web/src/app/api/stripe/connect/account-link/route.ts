import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { createAccountLink } from '@/lib/stripe';
import { ProfileService } from '@/lib/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    // Get user's Connect account ID
    const profile = await ProfileService.getProfile(req.userId);
    
    if (!profile?.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'No Connect account found. Please create one first.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sales`;
    const refreshUrl = body.refreshUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sales`;

    // Create account link for onboarding
    const result = await createAccountLink(
      profile.stripeConnectAccountId,
      returnUrl,
      refreshUrl
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
    });
  } catch (error) {
    console.error('Error creating account link:', error);
    return NextResponse.json(
      { error: 'Failed to create account link' },
      { status: 500 }
    );
  }
});

