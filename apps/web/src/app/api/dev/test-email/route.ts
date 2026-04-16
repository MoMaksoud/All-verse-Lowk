import { sendOrderConfirmationEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { isDevOrTestRouteAllowed } from '@/lib/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  if (!isDevOrTestRouteAllowed(process.env.NODE_ENV, req.headers.get('x-dev-admin-token'), process.env.DEV_ADMIN_TOKEN)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const result = await sendOrderConfirmationEmail({
      orderId: "TEST1234",
      buyerName: "Mo",
      buyerEmail: "YOUR_REAL_EMAIL@gmail.com",
      items: [],
      subtotal: 1,
      tax: 0,
      fees: 0,
      total: 1,
      shippingAddress: {},
    });

    console.log("[DEV TEST EMAIL RESULT]", result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[DEV TEST EMAIL ERROR]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
});
