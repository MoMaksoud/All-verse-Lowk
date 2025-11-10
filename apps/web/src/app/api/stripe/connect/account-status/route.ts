import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getConnectAccount } from '@/lib/stripe';
import { ProfileService } from '@/lib/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const profile = await ProfileService.getProfile(req.userId);
    
    if (!profile?.stripeConnectAccountId) {
      return NextResponse.json({
        hasAccount: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }

    const result = await getConnectAccount(profile.stripeConnectAccountId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Update profile if onboarding is complete
    if (result.chargesEnabled && result.payoutsEnabled && !profile.stripeConnectOnboardingComplete) {
      await ProfileService.updateProfile(req.userId, {
        stripeConnectOnboardingComplete: true,
      });
    }

    return NextResponse.json({
      hasAccount: true,
      accountId: profile.stripeConnectAccountId,
      chargesEnabled: result.chargesEnabled,
      payoutsEnabled: result.payoutsEnabled,
      detailsSubmitted: result.detailsSubmitted,
    });
  } catch (error) {
    console.error('Error getting account status:', error);
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    );
  }
});

