import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { searchListingsAdmin } from '@/lib/server/adminListings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory rate limit — 5 requests/min per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

function fallbackSuggestion(category: string, condition: string, currentPrice?: number): string {
  const conditionMultipliers: Record<string, number> = {
    new: 1.0, 'like new': 0.9, excellent: 0.85,
    good: 0.72, fair: 0.55, poor: 0.38,
  };
  const categoryRanges: Record<string, [number, number]> = {
    electronics: [40, 600], fashion: [8, 120], shoes: [10, 150],
    furniture: [20, 400], home: [10, 200], sports: [10, 150],
    books: [3, 25], automotive: [15, 500], toys: [5, 80],
    collectibles: [10, 300], jewelry: [10, 400], other: [5, 100],
  };
  const [low, high] = categoryRanges[category.toLowerCase()] || categoryRanges.other;
  const mult = conditionMultipliers[condition.toLowerCase()] ?? 0.72;
  const midpoint = currentPrice ? currentPrice : (low + high) / 2;
  const min = Math.round(midpoint * mult * 0.85);
  const max = Math.round(midpoint * mult * 1.15);

  return `Based on typical ${category} items in ${condition} condition, similar items on resale markets tend to sell in the $${min}–$${max} range.\n\nTips:\n- Price closer to $${max} if the item is barely used or includes original packaging.\n- Price closer to $${min} if you want a quick sale.\n- Search AllVerse for comparable listings before finalising.`;
}

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const { title, description, category, condition = 'Good', currentPrice, size } = await request.json().catch(() => ({}));

  if (!title || !category) {
    return NextResponse.json({ error: 'title and category are required' }, { status: 400 });
  }

  // Pull similar active listings from our own marketplace to ground the suggestion.
  let marketContext = '';
  try {
    const similar = await searchListingsAdmin(
      { isActive: true, category },
      { field: 'createdAt', direction: 'desc' },
      20
    );
    const comps = similar.items
      .filter((l) => l.id && l.price > 0)
      .slice(0, 8)
      .map((l) => `• ${l.title} — $${l.price} (${(l as any).condition || 'N/A'})`)
      .join('\n');
    if (comps) {
      marketContext = `\n\nCurrent comparable listings on AllVerse:\n${comps}`;
    }
  } catch {
    // Non-critical — continue without it
  }

  const prompt = `You are a pricing expert for a peer-to-peer resale marketplace called AllVerse.

Item details:
- Title: ${title}
- Description: ${description || 'Not provided'}
- Category: ${category}
- Condition: ${condition}${size ? `\n- Size: ${size}` : ''}${currentPrice ? `\n- Seller's current asking price: $${currentPrice}` : ''}
${marketContext}

Give a concise, honest price recommendation. Include:
1. A specific recommended price range (e.g. "$45–$65")
2. 1–2 sentences explaining why, referencing the condition and any comparable listings above
3. One actionable tip (e.g. when to go higher or lower)

Be direct and specific. Do not use filler phrases. Keep the total response under 100 words.`;

  try {
    const result = await GeminiService.generateResponse(prompt);
    if (result.success && result.message) {
      return NextResponse.json({ suggestion: result.message, success: true, source: 'ai' });
    }
  } catch (err: any) {
    const isQuota = err?.message?.includes('quota') || err?.message?.includes('429');
    if (!isQuota) console.error('Price suggest AI error:', err?.message);
  }

  // Fallback: honest, category-aware estimate
  return NextResponse.json({
    suggestion: fallbackSuggestion(category, condition, currentPrice),
    success: true,
    source: 'fallback',
  });
}
