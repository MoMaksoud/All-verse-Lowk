import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisService } from '@/lib/aiAnalysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  {
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
