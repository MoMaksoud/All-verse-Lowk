import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/server/push-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Internal endpoint — requires INTERNAL_OPS_TOKEN header
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-internal-token');
  if (!token || token !== process.env.INTERNAL_OPS_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { to, title, body: messageBody, data } = body;

    if (!to || !title || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields: to, title, body' }, { status: 400 });
    }

    await sendPushNotification({ to, title, body: messageBody, data });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    );
  }
}
