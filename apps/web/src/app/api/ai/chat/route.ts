import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { assertTokenBudget, addUsage } from '@/lib/aiUsage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_AI_DAILY_TOKENS || 5000);
const MAX_OUT_TOKENS = 256;
const isOutOfScope = (s: string) => /politic|news|program|code|crypto|vpn|religion|medical|legal|tax|homework|api key|bypass|hack/i.test(s || '');

import { withApi } from '@/lib/withApi';

export const POST = withApi(async (request: NextRequest & { userId: string }) => {
  console.log('🔵 AI Chat request received for user:', request.userId);
  
  try {
    // Check if Gemini API key is configured before processing
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is not configured');
      return NextResponse.json({
        response: 'AI service is not configured. Please contact support.',
        success: false,
        error: 'GEMINI_API_KEY missing'
      }, { status: 500 });
    }
    console.log('✅ Gemini API key found');

    // 1) Rate limit
    const ip = getIp(request as unknown as Request);
    checkRateLimit(ip, 60); // 60 req/min (tune as needed)
    console.log('✅ Rate limit check passed');

    const { message, mode = 'buyer', conversationHistory = [] } = await request.json();
    console.log('✅ Request body parsed, message length:', message?.length);

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
    console.log('🔵 Checking token budget, precharge:', precharge);
    try {
      await assertTokenBudget(request.userId, precharge, DAILY_LIMIT);
      console.log('✅ Token budget check passed');
    } catch (error: any) {
      if (error?.message === 'TOKEN_LIMIT_EXCEEDED') {
        console.log('⚠️ Token limit exceeded');
        return NextResponse.json({
          success: false,
          response: 'Free daily AI limit reached. Try again tomorrow.'
        }, { status: 200 });
      }
      // For other errors, log but continue
      console.error('⚠️ Token budget check failed (continuing anyway):', error?.message);
    }

    // 5) Build conversation context safely (last 10 messages for context)
    const history = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10).map((m: any) => ({
          role: m?.role === 'user' ? 'user' : 'assistant',
          parts: [{ text: String(m?.content ?? '') }],
          content: String(m?.content ?? ''),
        }))
      : [];

    console.log('🔵 Calling Gemini API, mode:', mode);
    const responseText = await GeminiService.generateAIResponse(
      mode === 'seller' ? 'seller' : 'buyer',
      trimmed,
      history
    );
    console.log('✅ Gemini API response received, length:', responseText?.length);
    
    // 7) Reconcile approximate output tokens
    const outputTokens = Math.ceil((responseText || '').length / 4);
    console.log('🔵 Updating usage, total tokens:', inputTokens + outputTokens);
    await addUsage(request.userId, inputTokens + outputTokens, precharge).catch(err => {
      console.error('⚠️ Usage update failed (non-blocking):', err?.message);
    });

    console.log('✅ Returning successful response');
    return NextResponse.json({ response: responseText, success: true });

  } catch (error: any) {
    // Return a safe fallback message with 200 status so UI can display it
    const msg = error?.message || 'Internal error';
    const errorStack = error?.stack || '';
    
    // Log detailed error information for debugging
    console.error('❌ AI chat error:', {
      message: msg,
      stack: errorStack,
      userId: request.userId,
      timestamp: new Date().toISOString(),
      errorType: error?.constructor?.name || 'Unknown'
    });
    
    // Check for specific error types and provide better messages
    let userMessage = 'I hit a temporary error. Please try again shortly.';
    
    if (msg.includes('GEMINI_API_KEY') || msg.includes('API key')) {
      userMessage = 'AI service is not configured. Please contact support.';
      console.error('❌ GEMINI_API_KEY is missing or invalid');
    } else if (msg.includes('TOKEN_LIMIT_EXCEEDED')) {
      userMessage = 'Free daily AI limit reached. Try again tomorrow.';
    } else if (msg.includes('quota') || msg.includes('429') || msg.includes('Too Many Requests')) {
      userMessage = 'AI service is temporarily unavailable due to high demand. Please try again in a moment.';
    } else if (msg.includes('Firestore') || msg.includes('Firebase') || msg.includes('getAdminFirestore') || msg.includes('ERR_NAME_NOT_RESOLVED') || msg.includes('ERR_QUIC_PROTOCOL_ERROR')) {
      // Firestore/DNS errors - show generic error, not network error
      userMessage = 'I hit a temporary error. Please try again shortly.';
      console.error('⚠️ Firestore/DNS error (non-critical, AI should still work):', msg);
    } else if ((msg.includes('network') || msg.includes('fetch') || msg.includes('ECONNREFUSED')) && !msg.includes('Firestore') && !msg.includes('Firebase')) {
      // Only show network error if it's not a Firestore/Firebase error
      userMessage = 'Unable to connect to AI service. Please check your internet connection and try again.';
    }
    
    return NextResponse.json({
      response: userMessage,
      success: false,
      error: process.env.NODE_ENV === 'development' ? msg : undefined
    });
  }
});