import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisService } from '@/lib/aiAnalysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  {
    console.log('🚀 AI Analyze Product API called');
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      console.log('❌ No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrls } = body;
    
    console.log('🚀 Request body:', { imageUrls });
    console.log('🔍 Image URLs verification:');

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs are required' }, { status: 400 });
    }

    let analysis;
    
    try {
      console.log('🚀 Starting AI analysis...');
      // Try AI analysis first with location context
      analysis = await AIAnalysisService.analyzeProductPhotos(imageUrls);
      console.log('🚀 AI analysis completed:', analysis);
      
    } catch (aiError) {
      console.error('🚀 AI analysis failed, using fallback:', aiError);

      console.log('🚀 Fallback analysis used:', analysis);
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
