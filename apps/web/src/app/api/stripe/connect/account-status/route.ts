import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getConnectAccount } from '@/lib/stripe';
import { getProfileDocumentAdmin, mergeProfileAdmin } from '@/lib/server/adminProfiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const profile = await getProfileDocumentAdmin(req.userId);
    
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
      // Avoid 500: Stripe errors are common (invalid key, deleted account). UI can still load.
      return NextResponse.json({
        hasAccount: true,
        accountId: profile.stripeConnectAccountId,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: profile.stripeConnectOnboardingComplete ?? false,
        connectError: result.error ?? 'Unable to load Stripe account',
      });
    }

    // Update profile if onboarding is complete (Admin SDK — client rules block server writes)
    if (result.chargesEnabled && result.payoutsEnabled && !profile.stripeConnectOnboardingComplete) {
      await mergeProfileAdmin(req.userId, {
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

