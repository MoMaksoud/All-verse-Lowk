import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { title, description, category, condition, location, brand, model } = await req.json();

    if (!title || !category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }

    console.log('🔍 Starting AI market analysis for:', { title, category, condition, location });

    const model_ai = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
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
    - Location: ${location || 'United States'}

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
        "regionalInsights": "Location-specific pricing insights",
        "conditionNotes": "How condition affects the suggested price"
      },
      "recommendations": [
        "Recommendation 1",
        "Recommendation 2",
        "Recommendation 3"
      ]
    }

    Guidelines (US MARKET ONLY):
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
    const text = response.text();

    console.log('🔍 Raw AI market analysis response:', text);

    // Clean and parse JSON response
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    console.log('🔍 Cleaned AI response:', cleanText);
    
    let analysis;
    try {
      analysis = JSON.parse(cleanText);
      console.log('🔍 Parsed AI market analysis:', analysis);
    } catch (parseError) {
      console.error('🔍 JSON parsing failed:', parseError);
      console.error('🔍 Raw text that failed to parse:', cleanText);
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
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
