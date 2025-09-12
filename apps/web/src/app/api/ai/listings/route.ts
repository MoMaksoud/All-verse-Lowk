import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { FirebaseAIService } from '@/lib/firebase-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('🤖 Processing listings query:', query);

    // Try Firebase AI first for enhanced intelligence
    const firebaseResponse = await FirebaseAIService.intelligentProductSearch(query);
    
    if (firebaseResponse.success && firebaseResponse.data?.recommendations) {
      const payload = {
        items: firebaseResponse.data.recommendations,
        meta: {
          query: query,
          total: firebaseResponse.data.recommendations.length,
          limit: 12,
          intent: firebaseResponse.data.intent || determineIntent(query),
          aiGenerated: true,
          confidence: firebaseResponse.data.confidence,
          marketInsights: firebaseResponse.data.marketInsights
        }
      };

      console.log('🤖 Returning Firebase AI payload:', payload);

      return NextResponse.json({
        success: true,
        data: payload,
        message: 'Firebase AI-generated listings created successfully'
      });
    }

    // Fallback to Gemini if Firebase AI fails
    const aiResponse = await GeminiService.generateIntelligentListings(query);
    
    if (aiResponse.success && aiResponse.listings) {
      const payload = {
        items: aiResponse.listings,
        meta: {
          query: query,
          total: aiResponse.listings.length,
          limit: 12,
          intent: determineIntent(query),
          aiGenerated: true
        }
      };

      console.log('🤖 Returning Gemini AI payload:', payload);

      return NextResponse.json({
        success: true,
        data: payload,
        message: 'Gemini AI-generated listings created successfully'
      });
    }

    // Fallback to enhanced static data if AI fails
    const items = generateContextualListings(query);

    const payload = {
      items,
      meta: {
        query: query,
        total: items.length,
        limit: 12,
        intent: determineIntent(query),
        aiGenerated: false
      }
    };

    console.log('🤖 Returning fallback payload:', payload);

    return NextResponse.json({
      success: true,
      data: payload,
      message: 'Enhanced listings generated successfully'
    });

  } catch (error) {
    console.error('🤖 AI listings API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate listings',
        data: { items: [], meta: { query: '', total: 0, limit: 12, intent: 'search' } }
      },
      { status: 500 }
    );
  }
}

function determineIntent(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('trending') || lowerQuery.includes('popular')) {
    return 'trending';
  }
  if (lowerQuery.includes('deal') || lowerQuery.includes('cheap') || lowerQuery.includes('budget')) {
    return 'deals';
  }
  if (lowerQuery.includes('new') || lowerQuery.includes('latest')) {
    return 'new';
  }
  if (lowerQuery.includes('best') || lowerQuery.includes('top')) {
    return 'best';
  }
  
  return 'search';
}

function generateContextualListings(query: string) {
  const lowerQuery = query.toLowerCase();
  
  // Enhanced listings pool with better images and titles
  const allListings = [
    {
      id: "sample-1",
      title: "iPhone 13 Pro 128GB - Space Gray",
      price: { value: 799.99, currency: "USD" },
      condition: "Like New",
      seller: { id: "seller-2", name: "TechDeals" },
      imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop",
      url: "/listings/sample-1",
      category: "electronics",
      badges: ["Trending"],
      location: "Miami, FL",
      createdAt: "2025-01-15T20:00:00.000Z",
      score: 0.95
    },
    {
      id: "sample-2",
      title: "Nike Air Max 270 - Size 10 White",
      price: { value: 120.00, currency: "USD" },
      condition: "Good",
      seller: { id: "seller-3", name: "SneakerHead" },
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
      url: "/listings/sample-2",
      category: "fashion",
      badges: ["Hot"],
      location: "Orlando, FL",
      createdAt: "2025-01-15T19:30:00.000Z",
      score: 0.90
    },
    {
      id: "sample-3",
      title: "MacBook Pro 14-inch M2 Chip 512GB",
      price: { value: 1299.99, currency: "USD" },
      condition: "Excellent",
      seller: { id: "seller-5", name: "AppleReseller" },
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
      url: "/listings/sample-3",
      category: "electronics",
      badges: ["Trending"],
      location: "Tampa, FL",
      createdAt: "2025-01-15T16:10:00.000Z",
      score: 0.88
    },
    {
      id: "sample-4",
      title: "Samsung Galaxy S24 256GB - Phantom Black",
      price: { value: 699.99, currency: "USD" },
      condition: "New",
      seller: { id: "seller-4", name: "MobileWorld" },
      imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop",
      url: "/listings/sample-4",
      category: "electronics",
      badges: ["New"],
      location: "Jacksonville, FL",
      createdAt: "2025-01-15T15:45:00.000Z",
      score: 0.92
    },
    {
      id: "sample-5",
      title: "AirPods Pro 2nd Generation - White",
      price: { value: 199.99, currency: "USD" },
      condition: "Like New",
      seller: { id: "seller-6", name: "AudioTech" },
      imageUrl: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=300&fit=crop",
      url: "/listings/sample-5",
      category: "electronics",
      badges: ["Popular"],
      location: "Fort Lauderdale, FL",
      createdAt: "2025-01-15T14:20:00.000Z",
      score: 0.87
    },
    {
      id: "sample-6",
      title: "Nike Dunk Low Retro - Black White",
      price: { value: 95.00, currency: "USD" },
      condition: "Good",
      seller: { id: "seller-7", name: "SneakerVault" },
      imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop",
      url: "/listings/sample-6",
      category: "fashion",
      badges: ["Classic"],
      location: "Tallahassee, FL",
      createdAt: "2025-01-15T13:15:00.000Z",
      score: 0.85
    },
    {
      id: "sample-7",
      title: "iPad Air 5th Gen 64GB - Space Gray",
      price: { value: 449.99, currency: "USD" },
      condition: "Excellent",
      seller: { id: "seller-8", name: "TabletPro" },
      imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop",
      url: "/listings/sample-7",
      category: "electronics",
      badges: ["Deal"],
      location: "Gainesville, FL",
      createdAt: "2025-01-15T12:30:00.000Z",
      score: 0.89
    },
    {
      id: "sample-8",
      title: "Adidas Ultraboost 22 - Size 9 Black",
      price: { value: 140.00, currency: "USD" },
      condition: "Good",
      seller: { id: "seller-9", name: "RunFast" },
      imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
      url: "/listings/sample-8",
      category: "fashion",
      badges: ["Popular"],
      location: "Pensacola, FL",
      createdAt: "2025-01-15T11:45:00.000Z",
      score: 0.83
    }
  ];

  // Filter and rank based on query context
  let filteredListings = allListings;
  
  // Category-based filtering with better matching
  if (lowerQuery.includes('phone') || lowerQuery.includes('iphone') || lowerQuery.includes('samsung') || lowerQuery.includes('galaxy')) {
    filteredListings = allListings.filter(item => 
      item.title.toLowerCase().includes('phone') || 
      item.title.toLowerCase().includes('iphone') || 
      item.title.toLowerCase().includes('samsung') ||
      item.title.toLowerCase().includes('galaxy')
    );
  } else if (lowerQuery.includes('laptop') || lowerQuery.includes('macbook') || lowerQuery.includes('computer')) {
    filteredListings = allListings.filter(item => 
      item.title.toLowerCase().includes('macbook') || 
      item.title.toLowerCase().includes('laptop') ||
      item.title.toLowerCase().includes('ipad')
    );
  } else if (lowerQuery.includes('shoe') || lowerQuery.includes('nike') || lowerQuery.includes('sneaker') || lowerQuery.includes('adidas')) {
    filteredListings = allListings.filter(item => 
      item.title.toLowerCase().includes('nike') || 
      item.title.toLowerCase().includes('air') ||
      item.title.toLowerCase().includes('adidas') ||
      item.title.toLowerCase().includes('dunk')
    );
  } else if (lowerQuery.includes('electronics') || lowerQuery.includes('tech') || lowerQuery.includes('apple')) {
    filteredListings = allListings.filter(item => item.category === 'electronics');
  } else if (lowerQuery.includes('fashion') || lowerQuery.includes('clothing') || lowerQuery.includes('sneaker')) {
    filteredListings = allListings.filter(item => item.category === 'fashion');
  }

  // Price-based filtering
  if (lowerQuery.includes('cheap') || lowerQuery.includes('budget') || lowerQuery.includes('under') || lowerQuery.includes('deal')) {
    filteredListings = filteredListings.filter(item => item.price.value < 300);
  } else if (lowerQuery.includes('expensive') || lowerQuery.includes('premium') || lowerQuery.includes('high-end') || lowerQuery.includes('pro')) {
    filteredListings = filteredListings.filter(item => item.price.value > 500);
  }

  // If no specific matches, return a good mix
  if (filteredListings.length === 0) {
    filteredListings = allListings;
  }

  // Sort by relevance score
  filteredListings.sort((a, b) => b.score - a.score);

  // Return top 4-6 results for better variety
  return filteredListings.slice(0, 6);
}