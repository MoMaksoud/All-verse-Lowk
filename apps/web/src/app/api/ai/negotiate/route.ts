import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getListingAdmin } from '@/lib/server/adminListings';
import { GeminiService } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/negotiate
 * Suggests the next message a buyer or seller should send during price negotiation.
 * Auth required — determines role from listing.sellerId vs req.userId.
 */
export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  const { listingId, messages = [] } = await req.json().catch(() => ({}));

  if (!listingId || typeof listingId !== 'string') {
    return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
  }

  const listing = await getListingAdmin(listingId).catch(() => null);
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const isSeller = listing.sellerId === req.userId;
  const role = isSeller ? 'seller' : 'buyer';

  // Format the last 6 messages for context
  const recentMessages = (Array.isArray(messages) ? messages : [])
    .slice(-6)
    .map((m: { role: string; text: string }) => `${m.role === 'mine' ? (isSeller ? 'Seller' : 'Buyer') : (isSeller ? 'Buyer' : 'Seller')}: ${m.text}`)
    .join('\n');

  const buyerPrompt = `You are helping a buyer on a peer-to-peer marketplace negotiate the price of an item.

Item: ${listing.title}
Asking price: $${listing.price}
Condition: ${(listing as any).condition || 'Not specified'}
Description: ${listing.description || 'Not provided'}

${recentMessages ? `Recent messages:\n${recentMessages}\n` : ''}
Write ONE short, natural, polite message the buyer could send right now. If no conversation yet, open with interest and make a reasonable offer (typically 10–20% below asking price for used items, smaller discount for new/like-new). If there is already negotiation happening, continue it naturally.

Rules:
- Return ONLY the message text. No quotes, no labels, no explanation.
- Be friendly, genuine, and specific to this item.
- Keep it under 3 sentences.
- Do not mention being an AI.`;

  const sellerPrompt = `You are helping a seller on a peer-to-peer marketplace respond to a buyer.

Your listing: ${listing.title}
Your asking price: $${listing.price}
Condition: ${(listing as any).condition || 'Not specified'}

${recentMessages ? `Recent messages:\n${recentMessages}\n` : ''}
Write ONE short, natural, polite response the seller could send right now. Be open to a small negotiation but protect your price — don't drop more than 15% unless the buyer has a compelling reason.

Rules:
- Return ONLY the message text. No quotes, no labels, no explanation.
- Be friendly but firm. Genuine, not robotic.
- Keep it under 3 sentences.
- Do not mention being an AI.`;

  const prompt = role === 'buyer' ? buyerPrompt : sellerPrompt;

  try {
    const result = await GeminiService.generateResponse(prompt);
    if (result.success && result.message?.trim()) {
      // Strip any accidental quotes the model might add
      const suggestion = result.message.trim().replace(/^["']|["']$/g, '');
      return NextResponse.json({ suggestion, role });
    }
  } catch (err: any) {
    console.error('Negotiate AI error:', err?.message);
  }

  return NextResponse.json(
    { error: 'Could not generate a suggestion right now. Try again.' },
    { status: 503 }
  );
});
