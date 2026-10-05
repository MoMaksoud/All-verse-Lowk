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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Fetch live external results for the same product to ground the suggestion
    let liveMarketContext = '';
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const searchQuery = title.split(/\s+/).slice(0, 6).join(' ');
      const searchRes = await fetch(
        `${baseUrl}/api/search?q=${encodeURIComponent(searchQuery)}&source=both&provider=auto`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const external = searchData?.data?.externalResults || [];
        const internal = searchData?.data?.internalResults || [];
        if (external.length > 0 || internal.length > 0) {
          const lines = [
            ...external.slice(0, 6).map((r: { title: string; price: number; source: string }) => `${r.source}: $${r.price} - ${r.title}`),
            ...internal.slice(0, 3).map((r: { title: string; price: number }) => `Our marketplace: $${r.price} - ${r.title}`),
          ];
          liveMarketContext = `\n\nLive market data (current search results for similar items):\n${lines.join('\n')}\n\nUse this data to inform your price suggestion.`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch live market data for price suggest:', e);
    }

    // Try Gemini AI first
    try {
      const pricePrompt = `You are a pricing expert. Suggest a fair market price range for:
Title: ${title}
Description: ${description}
Category: ${category}
Condition: ${condition}
${size ? `Size: ${size}` : ''}
${liveMarketContext}

Provide a concise price suggestion with a recommended price range and brief reasoning. Keep it under 100 words.${liveMarketContext ? ' Base your range on the live market data above when relevant.' : ''}`;

      const priceResponse = await GeminiService.generateResponse(pricePrompt);

      if (priceResponse.success) {
        return NextResponse.json({
          suggestion: priceResponse.message,
          success: true,
          source: 'ai'
        });
      }
    } catch (aiError) {
      console.error('AI service error:', aiError);
    }

    // No made-up numbers: if the model is unreachable, say so.
    return NextResponse.json(
      { error: 'AI pricing is unavailable right now.' },
      { status: 503 }
    );

  } catch (error) {
    console.error('Price suggestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
