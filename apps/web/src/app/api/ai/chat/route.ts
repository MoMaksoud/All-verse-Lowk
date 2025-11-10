import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { assertTokenBudget, addUsage } from '@/lib/aiUsage';

const DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_AI_DAILY_TOKENS || 5000);
const MAX_OUT_TOKENS = 256;
const isOutOfScope = (s: string) => /politic|news|program|code|crypto|vpn|religion|medical|legal|tax|homework|api key|bypass|hack/i.test(s || '');

import { withApi } from '@/lib/withApi';

export const POST = withApi(async (request: NextRequest & { userId: string }) => {
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

    // 3) Marketplace-only scope
    if (isOutOfScope(trimmed)) {
      return NextResponse.json({
        success: true,
        response: 'I can only help with marketplace-related questions (buying, selling, listings, pricing, shipping).'
      });
    }

    // 4) Enforce daily token budget (precharge input + max output)
    const inputTokens = Math.ceil(trimmed.length / 4);
    const precharge = inputTokens + MAX_OUT_TOKENS;
    try {
      await assertTokenBudget(request.userId, precharge, DAILY_LIMIT);
    } catch {
      return NextResponse.json({
        success: false,
        response: 'Free daily AI limit reached. Try again tomorrow.'
      }, { status: 200 });
    }

    // 5) Build conversation context safely (last 10 messages for context)
    const history = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10).map((m: any) => ({
          role: m?.role === 'user' ? 'user' : 'assistant',
          parts: [{ text: String(m?.content ?? '') }],
          content: String(m?.content ?? ''),
        }))
      : [];

    const responseText = await GeminiService.generateAIResponse(
      mode === 'seller' ? 'seller' : 'buyer',
      trimmed,
      history
    );
    // 7) Reconcile approximate output tokens
    const outputTokens = Math.ceil((responseText || '').length / 4);
    await addUsage(request.userId, inputTokens + outputTokens, precharge);

    return NextResponse.json({ response: responseText, success: true });

  } catch (error: any) {
    // Return a safe fallback message with 200 status so UI can display it
    const msg = error?.message || 'Internal error';
    console.error('AI chat error:', error);
    return NextResponse.json({
      response: 'I hit a temporary error. Please try again shortly.',
      success: false,
      error: msg
    });
  }
});