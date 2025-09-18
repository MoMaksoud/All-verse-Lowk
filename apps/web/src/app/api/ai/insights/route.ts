import { NextRequest, NextResponse } from 'next/server';
import { FirebaseAIService } from '@/lib/firebase-ai';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    console.log('📊 Generating market insights for:', category || 'general');

    const insights = await FirebaseAIService.generateMarketInsights(category || undefined);

    if (insights.success) {
      return NextResponse.json({
        success: true,
        data: insights.insights,
        timestamp: insights.timestamp,
        message: 'Market insights generated successfully'
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: insights.error || 'Failed to generate insights',
          data: null
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('📊 Market insights API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        data: null
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productData } = await request.json();

    if (!productData) {
      return NextResponse.json({ error: 'Product data is required' }, { status: 400 });
    }

    console.log('💰 Optimizing pricing for product:', productData.title || 'Unknown');

    const pricing = await FirebaseAIService.optimizePricing(productData);

    if (pricing.success) {
      return NextResponse.json({
        success: true,
        data: pricing.pricing,
        timestamp: pricing.timestamp,
        message: 'Pricing optimization completed successfully'
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: pricing.error || 'Failed to optimize pricing',
          data: null
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('💰 Pricing optimization API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        data: null
      },
      { status: 500 }
    );
  }
}
