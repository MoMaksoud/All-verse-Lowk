import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const userMessage = message.toLowerCase().trim();

    // Get all listings for context
    const listings = await db.list();

    // Smart routing and responses
    let response = '';
    let suggestions: string[] = [];
    let listing = null;

    // Product search queries
    if (userMessage.includes('show me') || userMessage.includes('find') || userMessage.includes('search')) {
      const category = extractCategory(userMessage);
      const priceRange = extractPriceRange(userMessage);
      
      if (category) {
        const categoryListings = listings.filter(l => l.category === category);
        if (categoryListings.length > 0) {
          listing = categoryListings[0]; // Show first match
          response = `I found some ${category} items! Here's one that might interest you. There are ${categoryListings.length} total ${category} items available.`;
          suggestions = [
            `Show me more ${category}`,
            `What's the cheapest ${category}?`,
            `Show me electronics`,
            `Find sports equipment`
          ];
        } else {
          response = `I don't see any ${category} items available right now. Would you like me to show you what we have in other categories?`;
          suggestions = ['Show me electronics', 'Show me fashion', 'Show me home items', 'Show me sports'];
        }
      } else {
        response = `I'd be happy to help you find items! What category are you looking for?`;
        suggestions = ['Show me electronics', 'Show me fashion', 'Show me home items', 'Show me sports'];
      }
    }
    // Price-related queries
    else if (userMessage.includes('cheap') || userMessage.includes('budget') || userMessage.includes('affordable')) {
      const sortedListings = listings.sort((a, b) => a.price - b.price);
      listing = sortedListings[0];
      response = `Here's our most affordable item! We have items starting from $${sortedListings[0].price.toLocaleString()}.`;
      suggestions = ['Show me electronics', 'Show me fashion', 'What\'s trending?', 'Help me sell something'];
    }
    // Trending/popular queries
    else if (userMessage.includes('trending') || userMessage.includes('popular') || userMessage.includes('best')) {
      const recentListings = listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      listing = recentListings[0];
      response = `Here's one of our newest listings! This item was just added and might be what you're looking for.`;
      suggestions = ['Show me electronics', 'Show me fashion', 'Show me sports', 'What\'s the cheapest?'];
    }
    // Selling help
    else if (userMessage.includes('sell') || userMessage.includes('list') || userMessage.includes('post')) {
      response = `I can help you sell items! You can create a new listing by going to our "Sell" page. I can also suggest prices for your items. What would you like to sell?`;
      suggestions = ['How do I price my item?', 'What categories can I sell?', 'Show me electronics', 'Find sports equipment'];
    }
    // Price suggestion
    else if (userMessage.includes('price') || userMessage.includes('worth') || userMessage.includes('value')) {
      response = `I can help you with pricing! If you have an item to sell, I can suggest a fair price based on similar items in our marketplace. What item are you looking to price?`;
      suggestions = ['How do I price my item?', 'Show me electronics', 'What\'s trending?', 'Help me sell something'];
    }
    // General help
    else if (userMessage.includes('help') || userMessage.includes('how') || userMessage.includes('what')) {
      response = `I'm here to help! I can help you find products, suggest prices, and guide you through our marketplace. What would you like to know?`;
      suggestions = ['Show me electronics', 'Find sports equipment', 'What\'s trending?', 'Help me sell something'];
    }
    // Default response
    else {
      response = `I understand you're looking for something! I can help you find products, suggest prices, or guide you through our marketplace. What would you like to do?`;
      suggestions = ['Show me electronics', 'Find sports equipment', 'What\'s trending?', 'Help me sell something'];
    }

    return NextResponse.json({
      response,
      suggestions,
      listing: listing ? {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        photos: listing.photos,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      } : null
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
