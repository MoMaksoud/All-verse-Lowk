import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/email';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, userId } = body;

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    await firestore.collection('verification_tokens').doc(token).set({
      userId,
      email,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      used: false,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify?token=${token}`;

    const result = await sendVerificationEmail(email, verificationUrl);

    if (!result.success) {
      await firestore.collection('verification_tokens').doc(token).delete();
      return NextResponse.json(
        { error: result.error || 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

