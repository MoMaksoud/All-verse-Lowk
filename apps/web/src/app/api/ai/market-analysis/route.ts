import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { GEMINI_MODELS } from '@/lib/ai/models';
export const runtime = 'nodejs';
export const preferredRegion = 'iad1';
export const dynamic = 'force-dynamic';

// Check for Gemini API key
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY is not configured');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!apiKey || !genAI) {
      return NextResponse.json({ 
        error: 'AI service is not configured',
        details: 'GEMINI_API_KEY is missing. Please configure it in your environment variables.'
      }, { status: 500 });
    }

    // Basic rate limit (30/min per IP)
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 30);
    const { title, description, category, condition, brand, model } = await req.json();

    if (!title || !category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }

    console.log('🔍 Starting AI market analysis for:', { title, category, condition });

    // Fetch live external results to ground the analysis
    let liveMarketBlock = '';
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const searchQuery = [brand, model, title].filter(Boolean).join(' ').trim() || title;
      const searchRes = await fetch(
        `${baseUrl}/api/search?q=${encodeURIComponent(searchQuery.slice(0, 80))}&source=both&provider=auto`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const external = searchData?.data?.externalResults || [];
        const internal = searchData?.data?.internalResults || [];
        if (external.length > 0 || internal.length > 0) {
          const lines = [
            ...external.slice(0, 8).map((r: { title: string; price: number; source: string }) => `${r.source}: $${r.price} — ${r.title}`),
            ...internal.slice(0, 4).map((r: { title: string; price: number }) => `Our marketplace: $${r.price} — ${r.title}`),
          ];
          liveMarketBlock = `\n\nLIVE MARKET DATA (current search results for this product):\n${lines.join('\n')}\n\nUse this live data to inform suggestedPrice, priceRange, and reasoning.`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch live market data for market analysis:', e);
    }

    const model_ai = genAI.getGenerativeModel({ 
      model: GEMINI_MODELS.SMART,
      generationConfig: {
        temperature: 0.3,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      }
    });

    const prompt = `
    You are a MARKET RESEARCH ANALYST for ALL VERSE GPT. Analyze the current market value for this specific item based on real-world data.

    Item Details:
    - Title: ${title}
    - Description: ${description || 'No description provided'}
    - Category: ${category}
    - Condition: ${condition || 'Good'}
    - Brand: ${brand || 'Unknown'}
    - Model: ${model || 'Unknown'}
    ${liveMarketBlock}

    Your task (US MARKET FOCUS ONLY):
    1. Research current US market prices for this exact item or similar items
    2. Use ONLY US marketplace data (eBay, Facebook Marketplace, Craigslist, OfferUp, Mercari, Poshmark, etc.)
    3. Consider US regional pricing differences (major cities vs rural areas)
    4. Factor in US cost of living differences by state/region
    5. Account for brand reputation and model popularity in the US market
    6. Consider US seasonal trends and market demand
    7. Focus on US consumer behavior and purchasing patterns

    Return ONLY valid JSON with this exact structure:

    {
      "marketAnalysis": {
        "suggestedPrice": number,
        "priceRange": {
          "min": number,
          "max": number
        },
        "confidence": number,
        "marketDemand": "high|medium|low",
        "competitorCount": number,
        "priceFactors": [
          "Factor 1",
          "Factor 2",
          "Factor 3"
        ],
        "regionalAdjustment": number,
        "conditionImpact": number
      },
      "reasoning": {
        "priceJustification": "Detailed explanation of why this price is suggested",
        "marketTrends": "Current market trends affecting this item",
        "regionalInsights": "Regional pricing insights",
        "conditionNotes": "How condition affects the suggested price"
      },
      "recommendations": [
        "Recommendation 1",
        "Recommendation 2",
        "Recommendation 3"
      ]
    }

    Guidelines (US MARKET ONLY):
    - When LIVE MARKET DATA is provided above, use it to set suggestedPrice and priceRange; base reasoning on those real results.
    - Use realistic US market prices based on actual US marketplace data
    - Consider depreciation for used items in US market
    - Factor in brand value and model popularity in US market
    - Account for US regional cost of living differences (CA, NY, TX, FL, etc.)
    - Provide confidence score (0.0-1.0) based on US data availability
    - Suggest competitive pricing strategies for US marketplaces
    - Focus on US consumer preferences and buying patterns

    Return ONLY the JSON.
    `;

    const result = await model_ai.generateContent(prompt);
    const response = await result.response;
    
    // Handle response - since responseMimeType is set to JSON, it might already be parsed
    let analysis: any;
    try {
      const text = response.text();
      console.log('🔍 Raw AI market analysis response:', text);
      
      // Clean and parse JSON response
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      console.log('🔍 Cleaned AI response:', cleanText);
      
      analysis = JSON.parse(cleanText);
      console.log('🔍 Parsed AI market analysis:', analysis);
    } catch (parseError) {
      // Try to get JSON directly if responseMimeType handled it
      try {
        const jsonText = (response as any).text?.() || '';
        if (jsonText) {
          analysis = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
          console.log('🔍 Parsed from JSON response:', analysis);
        } else {
          throw parseError;
        }
      } catch (fallbackError) {
        console.error('🔍 JSON parsing failed:', parseError);
        console.error('🔍 Fallback parsing also failed:', fallbackError);
        throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }
    }

    // Validate the analysis structure
    if (!analysis.marketAnalysis || typeof analysis.marketAnalysis.suggestedPrice !== 'number') {
      throw new Error('Invalid market analysis structure received from AI');
    }

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('🔍 Error in market analysis:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze market pricing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
