import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getTokenUsage } from '@/lib/aiUsage';

export const dynamic = 'force-dynamic';

const DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_AI_DAILY_TOKENS || 5000);

export const GET = withApi(async (request: NextRequest & { userId: string }) => {
  try {
    const usage = await getTokenUsage(request.userId, DAILY_LIMIT);
    
    return NextResponse.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
    console.error('Error getting token usage:', error);
    return NextResponse.json({
      success: false,
      data: {
        used: 0,
        remaining: DAILY_LIMIT,
        limit: DAILY_LIMIT,
      },
    });
  }
});

