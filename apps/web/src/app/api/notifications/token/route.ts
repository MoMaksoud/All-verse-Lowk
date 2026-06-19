import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { mergeProfileAdmin } from '@/lib/server/adminProfiles';

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
  await mergeProfileAdmin(req.userId, { expoPushToken: null });
  return NextResponse.json({ success: true });
});
