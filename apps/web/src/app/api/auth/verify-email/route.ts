import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/lib/email';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, email, userId } = body;

    if (!code || !email || !userId) {
      return NextResponse.json(
        { error: 'Code, email, and userId are required' },
        { status: 400 }
      );
    }

    // Verify code with Twilio
    const result = await verifyCode(email, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark email as verified in Firebase Auth
    const auth = getAdminAuth();
    if (auth) {
      await auth.updateUser(userId, {
        emailVerified: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

