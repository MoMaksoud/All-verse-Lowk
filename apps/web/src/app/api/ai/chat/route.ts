import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { message, mode = 'buyer', conversationHistory = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build conversation context for Gemini
    const historyContext = conversationHistory.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      parts: [{ text: msg.content }]
    }));

    // Generate AI response with full context
    const responseText = await GeminiService.generateAIResponse(
      mode, 
      message.trim(), 
      historyContext
    );

    return NextResponse.json({
      response: responseText,
      success: true
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { 
        response: 'Sorry, I encountered an error. Please try again.',
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
