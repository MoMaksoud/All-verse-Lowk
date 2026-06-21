import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getOrdersByBuyerAdmin } from '@/lib/server/adminOrders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  const limit = Number(new URL(req.url).searchParams.get('limit') || '20');
  const orders = await getOrdersByBuyerAdmin(req.userId, Math.min(limit, 50));

  const serialized = orders.map((o) => ({
    ...o,
    createdAt: (o.createdAt as any)?.toDate?.()?.toISOString?.() ?? null,
    updatedAt: (o.updatedAt as any)?.toDate?.()?.toISOString?.() ?? null,
    paidAt: (o.paidAt as any)?.toDate?.()?.toISOString?.() ?? null,
  }));

  return NextResponse.json({ success: true, data: serialized });
});
