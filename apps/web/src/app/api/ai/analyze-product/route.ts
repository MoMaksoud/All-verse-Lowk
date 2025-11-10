import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisService } from '@/lib/aiAnalysis';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { withApi } from '@/lib/withApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    // Rate limit to protect the AI endpoint (20/min)
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 20);

    const body = await req.json();
    const { imageUrls, phase, userAnswers, initialEvidence } = body;
    

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs are required' }, { status: 400 });
    }

    let analysis;
    
    try {
      if (phase === 'final' && userAnswers && initialEvidence) {
        // Phase 2: Generate final listing with user answers
        console.log('🔄 Phase 2: Generating final listing...');
        analysis = await AIAnalysisService.generateFinalListing(imageUrls, userAnswers, initialEvidence);
      } else {
        // Phase 1: Initial analysis
        console.log('🔄 Phase 1: Analyzing product photos...');
        analysis = await AIAnalysisService.analyzeProductPhotos(imageUrls);
      }
    } catch (aiError: any) {
      console.error('❌ AI analysis error:', aiError);
      return NextResponse.json({ 
        error: 'Failed to analyze product',
        details: aiError?.message || 'Unknown AI error',
        success: false 
      }, { status: 500 });
    }

    if (!analysis) {
      return NextResponse.json({ 
        error: 'Failed to analyze product',
        details: 'AI service returned no analysis result',
        success: false 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analysis,
      message: phase === 'final' 
        ? 'Final listing generated successfully' 
        : 'Product analysis completed successfully'
    });
  } catch (error: any) {
    console.error('❌ Error analyzing product:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze product',
      details: error?.message || 'Unknown error',
      success: false 
    }, { status: 500 });
  }
});
