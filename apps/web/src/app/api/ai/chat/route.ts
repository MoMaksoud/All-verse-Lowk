import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 1) Rate limit
    const ip = getIp(request as unknown as Request);
    checkRateLimit(ip, 60); // 60 req/min (tune as needed)

    const { message, mode = 'buyer', conversationHistory = [] } = await request.json();

    // 2) Input guards
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }
    if (trimmed.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // 3) Build conversation context safely
    const history = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10).map((m: any) => ({
          role: m?.role === 'user' ? 'user' : 'assistant',
          parts: [{ text: String(m?.content ?? '') }],
        }))
      : [];

    // 4) Timeout to avoid hanging calls
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20000); // 20s timeout

    const responseText = await GeminiService.generateAIResponse(
      mode === 'seller' ? 'seller' : 'buyer',
      trimmed,
      history
    );

    clearTimeout(t);
    return NextResponse.json({ response: responseText, success: true });

  } catch (error: any) {
    // Return a clean error with no stack
    const msg = error?.name === 'AbortError'
      ? 'AI timed out. Please try again.'
      : (error?.message || 'Internal error');
    return NextResponse.json({ response: msg, success: false, error: msg }, { status: 500 });
  }
}