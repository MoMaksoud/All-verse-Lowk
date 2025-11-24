import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const firestore = getAdminFirestore();
    const auth = getAdminAuth();

    if (!firestore || !auth) {
      return NextResponse.json(
        { error: 'Database or auth not available' },
        { status: 500 }
      );
    }

    const tokenDoc = await firestore.collection('verification_tokens').doc(token).get();

    if (!tokenDoc.exists) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    const tokenData = tokenDoc.data()!;

    if (tokenData.used) {
      return NextResponse.json(
        { error: 'This verification token has already been used' },
        { status: 400 }
      );
    }

    const expiresAt = new Date(tokenData.expiresAt);
    if (expiresAt < new Date()) {
      await firestore.collection('verification_tokens').doc(token).delete();
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    await firestore.collection('verification_tokens').doc(token).update({
      used: true,
      verifiedAt: new Date().toISOString(),
    });

    await auth.updateUser(tokenData.userId, {
      emailVerified: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      userId: tokenData.userId,
    });
  } catch (error: any) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

