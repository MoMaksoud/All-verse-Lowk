import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/email';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('📧 POST /api/auth/send-verification-email called');
  
  try {
    // Validate required environment variables upfront
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ Missing SENDGRID_API_KEY environment variable');
      return NextResponse.json(
        { error: 'SendGrid not configured - missing API key' },
        { status: 500 }
      );
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      console.error('❌ Missing SENDGRID_FROM_EMAIL environment variable');
      return NextResponse.json(
        { error: 'SendGrid not configured - missing from email' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email, userId } = body;

    if (!email || !userId) {
      console.error('❌ Missing email or userId in request body');
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    console.log('📧 Sending verification email to:', email);

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const firestore = getAdminFirestore();
    if (!firestore) {
      console.error('❌ Firestore not available');
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

    console.log('📧 Verification URL generated:', verificationUrl);

    const result = await sendVerificationEmail(email, verificationUrl);

    if (!result.success) {
      console.error('❌ Failed to send verification email:', result.error);
      await firestore.collection('verification_tokens').doc(token).delete();
      return NextResponse.json(
        { error: result.error || 'Failed to send verification email' },
        { status: 500 }
      );
    }

    console.log('✅ Verification email sent successfully');
    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error: any) {
    console.error('❌ Error in send-verification-email route:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

