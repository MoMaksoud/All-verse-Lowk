import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { mergeProfileAdmin } from '@/lib/server/adminProfiles';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  const { token } = await req.json();

  if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) {
    return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
  }

  await mergeProfileAdmin(req.userId, { expoPushToken: token });
  return NextResponse.json({ success: true });
});

export const DELETE = withApi(async (req: NextRequest & { userId: string }) => {
  await getAdminFirestore()
    .collection('profiles')
    .doc(req.userId)
    .update({ expoPushToken: FieldValue.delete() });
  return NextResponse.json({ success: true });
});
