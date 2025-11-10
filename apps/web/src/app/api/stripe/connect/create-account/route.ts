import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { createConnectAccount } from '@/lib/stripe';
import { ProfileService } from '@/lib/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already has a Connect account
    const profile = await ProfileService.getProfile(req.userId);
    if (profile?.stripeConnectAccountId) {
      return NextResponse.json({
        success: true,
        accountId: profile.stripeConnectAccountId,
        message: 'Connect account already exists',
      });
    }

    // Create Connect account
    const result = await createConnectAccount(email, req.userId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Save account ID to profile
    await ProfileService.updateProfile(req.userId, {
      stripeConnectAccountId: result.accountId,
      stripeConnectOnboardingComplete: false,
    });

    return NextResponse.json({
      success: true,
      accountId: result.accountId,
    });
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to create Connect account' },
      { status: 500 }
    );
  }
});

