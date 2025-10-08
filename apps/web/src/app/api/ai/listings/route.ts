import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { FirebaseAIService } from '@/lib/firebase-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('🤖 Processing listings query:', query);

    // Try Firebase AI first for enhanced intelligence
    const firebaseResponse = await FirebaseAIService.intelligentProductSearch(query);
    
    if (firebaseResponse.success && firebaseResponse.data?.recommendations) {
      const payload = {
        items: firebaseResponse.data.recommendations,
        meta: {
          query: query,
          total: firebaseResponse.data.recommendations.length,
          limit: 12,
          intent: firebaseResponse.data.intent || determineIntent(query),
          aiGenerated: true,
          confidence: firebaseResponse.data.confidence,
          marketInsights: firebaseResponse.data.marketInsights
        }
      };

      console.log('🤖 Returning Firebase AI payload:', payload);

      return NextResponse.json({
        success: true,
        data: payload,
        message: 'Firebase AI-generated listings created successfully'
      });
    }

    // Fallback to Gemini if Firebase AI fails
    const aiResponse = await GeminiService.generateIntelligentListings(query);
    
    if (aiResponse.success && aiResponse.listings) {
      const payload = {
        items: aiResponse.listings,
        meta: {
          query: query,
          total: aiResponse.listings.length,
          limit: 12,
          intent: determineIntent(query),
          aiGenerated: true
        }
      };

      console.log('🤖 Returning Gemini AI payload:', payload);

      return NextResponse.json({
        success: true,
        data: payload,
        message: 'Gemini AI-generated listings created successfully'
      });
    }

    // Fallback to enhanced static data if AI fails
    console.log('🔄 AI services failed, using enhanced fallback listings');
    const items = []; // Fallback to empty array when Firebase is not available

    const payload = {
      items,
      meta: {
        query: query,
        total: items.length,
        limit: 12,
        intent: determineIntent(query),
        aiGenerated: false,
        fallback: true
      }
    };

    console.log('🤖 Returning enhanced fallback payload:', payload);

    return NextResponse.json({
      success: true,
      data: payload,
      message: 'Enhanced fallback listings generated successfully'
    });

  } catch (error) {
    console.error('🤖 AI listings API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate listings',
        data: { items: [], meta: { query: '', total: 0, limit: 12, intent: 'search' } }
      },
      { status: 500 }
    );
  }
}

function determineIntent(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('trending') || lowerQuery.includes('popular')) {
    return 'trending';
  }
  if (lowerQuery.includes('deal') || lowerQuery.includes('cheap') || lowerQuery.includes('budget')) {
    return 'deals';
  }
  if (lowerQuery.includes('new') || lowerQuery.includes('latest')) {
    return 'new';
  }
  
  return 'search';
}