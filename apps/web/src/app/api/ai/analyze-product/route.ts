import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisService } from '@/lib/aiAnalysis';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';

export async function POST(req: NextRequest) {
  {
    // Rate limit to protect the AI endpoint (20/min)
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 20);
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrls } = body;
    

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs are required' }, { status: 400 });
    }

    let analysis;
    
    try {
      analysis = await AIAnalysisService.analyzeProductPhotos(imageUrls);
    } catch (aiError) {
    }

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
      },
      message: 'Product analysis completed successfully'
    });

  }
  
}
