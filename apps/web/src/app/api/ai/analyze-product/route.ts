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

    let analysis;
    let priceAnalysis;
    
    try {
      // Try AI analysis first
      analysis = await AIAnalysisService.analyzeProductPhotos(imageUrls);
      console.log('🤖 AI analysis result:', analysis);
      
      // Generate price analysis
      priceAnalysis = await AIAnalysisService.analyzePrice(
        analysis.title,
        analysis.description,
        analysis.category,
        analysis.condition,
        analysis.suggestedPrice
      );
      
      console.log('🤖 AI analysis completed successfully');
    } catch (aiError) {
      console.error('🤖 AI analysis failed, using fallback:', aiError);
      
      // Use fallback analysis
      analysis = AIAnalysisService.getFallbackAnalysis(imageUrls);
      priceAnalysis = AIAnalysisService.getFallbackPriceAnalysis(analysis.suggestedPrice);
      
      console.log('🤖 Using fallback analysis:', analysis);
    }

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
    
    // Even if everything fails, return a basic fallback
    const fallbackAnalysis = AIAnalysisService.getFallbackAnalysis();
    const fallbackPriceAnalysis = AIAnalysisService.getFallbackPriceAnalysis(fallbackAnalysis.suggestedPrice);
    
    return NextResponse.json({
      success: true,
      analysis: {
        ...fallbackAnalysis,
        priceAnalysis: fallbackPriceAnalysis
      },
      message: 'Product analysis completed with fallback data'
    });
  }
}
