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

    console.log('🤖 Starting AI analysis for listing:', listingId);
    console.log('🤖 Image URLs received:', imageUrls.length);

    // Analyze product photos
    const analysis = await AIAnalysisService.analyzeProductPhotos(imageUrls);
    console.log('🤖 Analysis result:', analysis);
    
    // Generate price analysis
    const priceAnalysis = await AIAnalysisService.analyzePrice(
      analysis.title,
      analysis.description,
      analysis.category,
      analysis.condition,
      analysis.suggestedPrice
    );

    console.log('🤖 AI analysis completed successfully');

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        priceAnalysis
      },
      message: 'Product analysis completed successfully'
    });

  } catch (error) {
    console.error('🤖 AI analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze product photos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
