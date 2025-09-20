import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisService } from '@/lib/aiAnalysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrls, listingId } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs are required' }, { status: 400 });
    }

    console.log('🧪 Testing fallback analysis for listing:', listingId);
    console.log('🧪 Image URLs received:', imageUrls.length);

    // Force fallback analysis
    const analysis = AIAnalysisService.getFallbackAnalysis(imageUrls);
    const priceAnalysis = AIAnalysisService.getFallbackPriceAnalysis(analysis.suggestedPrice);
    
    console.log('🧪 Fallback analysis result:', analysis);

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        priceAnalysis
      },
      message: 'Fallback analysis completed successfully'
    });

  } catch (error) {
    console.error('🧪 Fallback analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate fallback analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
