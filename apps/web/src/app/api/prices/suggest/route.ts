import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';

// Simple in-memory rate limiting (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  userLimit.count++;
  return true;
}

function generateFallbackPriceSuggestion(title: string, description: string, category: string, condition: string = 'Good'): string {
  // Simple fallback pricing logic based on category and condition
  const categoryBasePrices: Record<string, number> = {
    'electronics': 150,
    'fashion': 25,
    'home': 50,
    'sports': 40,
    'books': 10,
    'automotive': 200,
    'other': 30
  };

  const conditionMultipliers: Record<string, number> = {
    'new': 1.0,
    'excellent': 0.9,
    'good': 0.75,
    'fair': 0.6,
    'poor': 0.4
  };

  const basePrice = categoryBasePrices[category.toLowerCase()] || categoryBasePrices['other'];
  const conditionMultiplier = conditionMultipliers[condition.toLowerCase()] || conditionMultipliers['good'];
  
  // Add some randomness based on title length (proxy for complexity)
  const complexityFactor = Math.min(1.5, Math.max(0.5, title.length / 20));
  
  const suggestedPrice = Math.round(basePrice * conditionMultiplier * complexityFactor);
  const minPrice = Math.round(suggestedPrice * 0.8);
  const maxPrice = Math.round(suggestedPrice * 1.2);

  return `Great product!\n\nSuggested price: $${minPrice}-$${maxPrice}\nBased on ${category} market rates\n\nPro tip: Check competitor prices weekly\n\nReady to list?`;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please wait a moment before trying again.',
          fallback: true,
          retryAfter: 60
        },
        { status: 429 }
      );
    }

    const { title, description, category, condition, size } = await request.json();

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Title, description, and category are required' },
        { status: 400 }
      );
    }

    // Try Gemini AI first
    try {
      const priceResponse = await GeminiService.generatePriceSuggestion(
        title, 
        description, 
        category, 
        condition || 'Good',
        size || null
      );

      if (priceResponse.success) {
        return NextResponse.json({
          suggestion: priceResponse.message,
          success: true,
          source: 'ai'
        });
      }
    } catch (aiError: any) {
      console.error('AI service error:', aiError);
      
      // Check if it's a quota error
      if (aiError.message?.includes('quota') || aiError.message?.includes('429')) {
        console.log('🔄 AI quota exceeded, using fallback pricing');
        
        const fallbackSuggestion = generateFallbackPriceSuggestion(title, description, category, condition);
        
        return NextResponse.json({
          suggestion: fallbackSuggestion,
          success: true,
          source: 'fallback',
          warning: 'AI service temporarily unavailable. Using market-based pricing.'
        });
      }
    }

    // If AI fails for other reasons, use fallback
    console.log('🔄 AI service failed, using fallback pricing');
    const fallbackSuggestion = generateFallbackPriceSuggestion(title, description, category, condition);
    
    return NextResponse.json({
      suggestion: fallbackSuggestion,
      success: true,
      source: 'fallback',
      warning: 'AI service temporarily unavailable. Using market-based pricing.'
    });

  } catch (error) {
    console.error('Price suggestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}