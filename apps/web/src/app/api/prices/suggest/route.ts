import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, photos } = body;
    
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // Mock price suggestion logic
    const base = Math.min(999, Math.round(5 + title.length * 2 + description.length * 0.3));
    const photoFactor = (photos?.length ?? 0) * 3;
    const price = Math.max(5, base + photoFactor);
    const rationale = `Mock AI suggestion: Based on title length (${title.length} chars), description length (${description.length} chars), and ${photos?.length ?? 0} photos. This is a demo calculation.`;

    return NextResponse.json({ price, rationale });
  } catch (error) {
    console.error('Error suggesting price:', error);
    return NextResponse.json({ error: 'Failed to suggest price' }, { status: 500 });
  }
}
