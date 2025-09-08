import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { title, description, category } = await request.json();

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Title, description, and category are required' },
        { status: 400 }
      );
    }

    // Use Gemini AI to generate price suggestions
    const priceResponse = await GeminiService.generatePriceSuggestion(title, description, category);

    if (!priceResponse.success) {
      return NextResponse.json(
        { error: priceResponse.error || 'Failed to generate price suggestion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suggestion: priceResponse.message,
      success: true
    });

  } catch (error) {
    console.error('Price suggestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}