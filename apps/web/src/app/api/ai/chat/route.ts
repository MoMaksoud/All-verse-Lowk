import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { GeminiService } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const userMessage = message.trim();

    // Get all listings for context
    const listingsResponse = await db.list();
    const listings = listingsResponse.data;

    // Use Gemini AI to generate intelligent responses
    const aiResponse = await GeminiService.generateMarketplaceResponse(userMessage, {
      availableListings: listings.slice(0, 10), // Send first 10 listings as context
      totalListings: listings.length,
      categories: [...new Set(listings.map(l => l.category))]
    });

    // Generate contextual suggestions based on AI response
    const suggestions = await GeminiService.generateSearchSuggestions(userMessage);
    
    // Enhance suggestions based on AI response content
    let enhancedSuggestions = suggestions;
    if (aiResponse.message.toLowerCase().includes('electronics')) {
      enhancedSuggestions = ['Show Electronics', 'Find Laptops', 'Browse Phones', 'See Gaming Gear'];
    } else if (aiResponse.message.toLowerCase().includes('fashion')) {
      enhancedSuggestions = ['Browse Fashion', 'Find Shoes', 'See Accessories', 'Show Clothing'];
    } else if (aiResponse.message.toLowerCase().includes('trending')) {
      enhancedSuggestions = ['Trending This Week', 'Most Popular', 'New Arrivals', 'Best Deals'];
    } else if (aiResponse.message.toLowerCase().includes('category')) {
      enhancedSuggestions = ['Electronics', 'Fashion', 'Home', 'Sports'];
    }

    // Try to find relevant listings based on the user's message
    let relevantListing = null;
    
    // Simple keyword matching for now (can be enhanced with Gemini)
    const category = extractCategory(userMessage.toLowerCase());
    if (category) {
      const categoryListings = listings.filter(l => l.category === category);
      if (categoryListings.length > 0) {
        relevantListing = categoryListings[0];
      }
    }

    return NextResponse.json({
      response: aiResponse.message,
      suggestions: enhancedSuggestions.slice(0, 4), // Use enhanced suggestions
      listing: relevantListing ? {
        id: relevantListing.id,
        title: relevantListing.title,
        description: relevantListing.description,
        price: relevantListing.price,
        category: relevantListing.category,
        photos: relevantListing.photos,
        createdAt: relevantListing.createdAt,
        updatedAt: relevantListing.updatedAt
      } : null,
      success: aiResponse.success,
      error: aiResponse.error
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { 
        response: 'Sorry, I encountered an error while processing your request. Please try again.',
        suggestions: ['Show me electronics', 'Find sports equipment', 'What\'s trending?', 'Help me sell something'],
        listing: null,
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

function extractCategory(message: string): string | null {
  const categories = ['electronics', 'fashion', 'home', 'sports', 'automotive'];
  
  for (const category of categories) {
    if (message.includes(category)) {
      return category;
    }
  }
  
  // Check for synonyms
  if (message.includes('phone') || message.includes('laptop') || message.includes('computer') || message.includes('tech')) {
    return 'electronics';
  }
  if (message.includes('clothes') || message.includes('shoes') || message.includes('bag') || message.includes('jacket')) {
    return 'fashion';
  }
  if (message.includes('furniture') || message.includes('table') || message.includes('sofa') || message.includes('chair')) {
    return 'home';
  }
  if (message.includes('ball') || message.includes('racket') || message.includes('mat') || message.includes('equipment')) {
    return 'sports';
  }
  
  return null;
}

function extractPriceRange(message: string): { min?: number; max?: number } | null {
  const priceRegex = /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  const matches = message.match(priceRegex);
  
  if (!matches) return null;
  
  const prices = matches.map(match => parseFloat(match.replace(/[$,]/g, '')));
  
  if (prices.length === 1) {
    return { max: prices[0] };
  } else if (prices.length === 2) {
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
  
  return null;
}
