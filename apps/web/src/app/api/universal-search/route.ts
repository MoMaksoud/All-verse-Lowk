import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_MODELS } from '@/lib/ai/models';

export const dynamic = 'force-dynamic';

const SEARCH_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const searchCache = new Map<string, { data: SearchResponse; expiresAt: number }>();

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

interface ExternalResult {
  title: string;
  price: number;
  source: string;
  url: string;
  image?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
}

interface InternalResult {
  id: string;
  title: string;
  price: number;
  description: string;
  photos: string[];
  category: string;
  condition: string;
  sellerId: string;
  isMatched?: boolean;
  brand?: string;
  model?: string;
  gtin?: string;
}

interface SearchResponse {
  externalResults: ExternalResult[];
  internalResults: InternalResult[];
  summary: {
    overview: string;
    priceRange?: {
      min: number;
      max: number;
      average: number;
    };
    topRecommendations?: string[];
    marketInsights?: string[];
  } | null;
}

/**
 * POST: Image search - extract product search query from uploaded image via Gemini Vision
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile || !(imageFile instanceof Blob) || imageFile.size === 0) {
      return NextResponse.json(
        { error: 'Image file is required. Send as multipart/form-data with field "image".' },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Image search is not configured. Missing Gemini API key.' },
        { status: 503 }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const prompt = `Look at this product image. Identify what the product is and extract structured data for shopping search.
Reply with ONLY a JSON object (no markdown, no code block), exactly this structure:
{"query": "short search query 2-6 words", "brand": "BrandName or null", "model": "model or product line or null", "category": "electronics|fashion|home|sports|other or null"}
Use null when a field is not visible. For category use lowercase: electronics, fashion, home, sports, or other if unsure.`;

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.FAST });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      }],
    });

    const text = (result.response.text() || '').trim().replace(/^["']|["']$/g, '');
    let extractedQuery = 'product';
    let brand: string | null = null;
    let productModel: string | null = null;
    let category: string | null = null;

    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.query === 'string') extractedQuery = parsed.query.trim() || 'product';
      if (parsed?.brand && typeof parsed.brand === 'string') brand = parsed.brand.trim() || null;
      if (parsed?.model && typeof parsed.model === 'string') productModel = parsed.model.trim() || null;
      if (parsed?.category && typeof parsed.category === 'string') category = parsed.category.trim().toLowerCase() || null;
    } catch {
      extractedQuery = text || 'product';
    }

    const body: Record<string, string> = { extractedQuery };
    if (brand) body.brand = brand;
    if (productModel) body.model = productModel;
    if (category) body.category = category;
    return NextResponse.json(body);
  } catch (error) {
    console.error('Universal search image POST error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');
    const brand = searchParams.get('brand')?.trim() || undefined;
    const model = searchParams.get('model')?.trim() || undefined;
    const category = searchParams.get('category')?.trim()?.toLowerCase() || undefined;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const filterParts = [brand, model, category].filter(Boolean).sort().join('|');
    const cacheKey = normalizeQuery(query) + (filterParts ? `|${filterParts}` : '');
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const filters = (brand || model || category) ? { brand, model, category } : undefined;
    const [internalResults, externalResults] = await Promise.all([
      searchInternalListings(query, filters),
      searchExternalInternet(query),
    ]);

    console.log(`📊 Search results for "${query}":`, {
      internal: internalResults.length,
      external: externalResults.length
    });

    // Find matching internal listings (similar product, competitive price)
    const matchedInternalResults = findMatchingListings(internalResults, externalResults);
    
    // Sort: matched listings first, then rest
    const sortedInternalResults = [
      ...matchedInternalResults.filter(r => r.isMatched),
      ...matchedInternalResults.filter(r => !r.isMatched),
    ];

    console.log(`🎯 Matched internal listings: ${matchedInternalResults.filter(r => r.isMatched).length}`);

    const summary = await buildSummary(query, externalResults, sortedInternalResults);

    const response: SearchResponse = {
      externalResults,
      internalResults: sortedInternalResults,
      summary,
    };

    searchCache.set(cacheKey, { data: response, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Universal search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Optional filters from image search (brand, model, category) for improved ranking */
type SearchFilters = { brand?: string; model?: string; category?: string } | undefined;

/**
 * Search internal All Verse GPT listings using Gemini AI for intelligent matching
 */
async function searchInternalListings(query: string, filters?: SearchFilters): Promise<InternalResult[]> {
  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
      );
      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    const db = getFirestore();
    const listingsRef = db.collection('listings');

    // Fetch all active listings
    const snapshot = await listingsRef
      .where('isActive', '==', true)
      .limit(50) // Get more listings for Gemini to search through
      .get();

    if (snapshot.empty) {
      console.log('⚠️ No active internal listings found');
      return [];
    }

    const allListings: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      allListings.push({
          id: doc.id,
          title: data.title,
          price: Number(data.price) || 0,
          description: data.description,
          photos: data.images || [],
          category: data.category,
          condition: data.condition || 'good',
          sellerId: data.sellerId,
          brand: data.brand,
          model: data.model,
          gtin: data.gtin,
        });
    });

    console.log(`📦 Loaded ${allListings.length} internal listings for Gemini search`);

    // First-stage retrieval: limit candidate set by query keywords to reduce Gemini usage
    const queryTokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 3);
    let candidates = allListings;
    if (queryTokens.length > 0) {
      const filtered = allListings.filter(listing => {
        const title = (listing.title || '').toLowerCase();
        const description = (listing.description || '').toLowerCase();
        const category = (listing.category || '').toLowerCase();
        const text = `${title} ${description} ${category}`;
        return queryTokens.some(tok => text.includes(tok));
      });
      candidates = filtered.length >= 5 ? filtered.slice(0, 30) : allListings.slice(0, 30);
    } else {
      candidates = allListings.slice(0, 30);
    }
    console.log(`📦 Using ${candidates.length} candidates for Gemini ranking`);

    // Use Gemini to intelligently find matching listings
    const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn('⚠️ Gemini API key not configured, using simple keyword search');
      const queryLower = query.toLowerCase();
      let fallbackResults = allListings
        .filter(listing => {
          const title = (listing.title || '').toLowerCase();
          const description = (listing.description || '').toLowerCase();
          const cat = (listing.category || '').toLowerCase();
          return title.includes(queryLower) || description.includes(queryLower) || cat.includes(queryLower);
        })
        .slice(0, 8);
      if (filters && fallbackResults.length > 0) {
        const brandLower = filters.brand?.toLowerCase();
        const modelLower = filters.model?.toLowerCase();
        const categoryLower = filters.category?.toLowerCase();
        fallbackResults = [...fallbackResults].sort((a, b) => {
          const score = (r: InternalResult) => {
            let s = 0;
            if (brandLower && (r.brand || '').toLowerCase().includes(brandLower)) s += 2;
            if (modelLower && ((r.model || '').toLowerCase().includes(modelLower) || (r.title || '').toLowerCase().includes(modelLower))) s += 1;
            if (categoryLower && (r.category || '').toLowerCase().includes(categoryLower)) s += 1;
            return s;
          };
          return score(b) - score(a);
        });
      }
      return fallbackResults as InternalResult[];
    }

    // Prepare listings context for Gemini (candidate set only)
    const listingsContext = candidates
      .map((listing, index) => 
        `${index + 1}. ID: ${listing.id} | Title: ${listing.title} | Price: $${listing.price} | Category: ${listing.category} | Condition: ${listing.condition} | Description: ${listing.description}`
      )
      .join('\n');

    const prompt = `You are a marketplace search assistant. Given a user's search query and a list of available products, identify the most relevant products that match the query.

Search Query: "${query}"

Available Products:
${listingsContext}

Return ONLY a JSON array of product IDs that match the search query, ordered by relevance (most relevant first). Return up to 8 IDs.
Format: ["id1", "id2", "id3"]

If no products match, return an empty array: []`;

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.FAST });

    console.log('🤖 Asking Gemini to search internal listings...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('✅ Gemini search response:', responseText);

    // Parse Gemini's response
    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.warn('⚠️ Gemini did not return valid JSON, using top candidates');
      let fallback = candidates.slice(0, 8) as InternalResult[];
      if (filters && fallback.length > 0) {
        const brandLower = filters.brand?.toLowerCase();
        const modelLower = filters.model?.toLowerCase();
        const categoryLower = filters.category?.toLowerCase();
        fallback = [...fallback].sort((a, b) => {
          const score = (r: InternalResult) => {
            let s = 0;
            if (brandLower && (r.brand || '').toLowerCase().includes(brandLower)) s += 2;
            if (modelLower && ((r.model || '').toLowerCase().includes(modelLower) || (r.title || '').toLowerCase().includes(modelLower))) s += 1;
            if (categoryLower && (r.category || '').toLowerCase().includes(categoryLower)) s += 1;
            return s;
          };
          return score(b) - score(a);
        });
      }
      return fallback;
    }

    const matchedIds: string[] = JSON.parse(jsonMatch[0]);
    console.log(`🎯 Gemini matched ${matchedIds.length} internal listings`);

    // Return listings in the order Gemini suggested (from candidate set)
    let orderedResults = matchedIds
      .map(id => candidates.find((l: { id: string }) => l.id === id))
      .filter(Boolean) as InternalResult[];

    // When filters from image search are provided, prefer listings that match brand/model/category
    if (filters && orderedResults.length > 0) {
      const brandLower = filters.brand?.toLowerCase();
      const modelLower = filters.model?.toLowerCase();
      const categoryLower = filters.category?.toLowerCase();
      orderedResults = [...orderedResults].sort((a, b) => {
        const score = (r: InternalResult) => {
          let s = 0;
          if (brandLower && (r.brand || '').toLowerCase().includes(brandLower)) s += 2;
          if (modelLower && ((r.model || '').toLowerCase().includes(modelLower) || (r.title || '').toLowerCase().includes(modelLower))) s += 2;
          if (categoryLower && (r.category || '').toLowerCase().includes(categoryLower)) s += 1;
          return s;
        };
        return score(b) - score(a);
      });
    }

    return orderedResults;

  } catch (error) {
    console.error('Error searching internal listings:', error);
    return [];
  }
}

/**
 * Find internal listings that match external products
 * Matches based on title similarity and competitive pricing
 */
function findMatchingListings(
  internalResults: InternalResult[],
  externalResults: ExternalResult[]
): InternalResult[] {
  if (internalResults.length === 0 || externalResults.length === 0) {
    return internalResults;
  }

  // Calculate average external price for comparison
  const externalPrices = externalResults.filter(r => r.price > 0).map(r => r.price);
  const avgExternalPrice = externalPrices.length > 0
    ? externalPrices.reduce((a, b) => a + b, 0) / externalPrices.length
    : 0;

  return internalResults.map(internal => {
    let isMatched = false;

    for (const external of externalResults) {
      const extTitle = external.title.toLowerCase();

      // Prefer structured match: brand + model align with external title
      if (internal.brand && internal.model) {
        const brandMatch = extTitle.includes(internal.brand.toLowerCase());
        const modelMatch = extTitle.includes(internal.model.toLowerCase());
        if (brandMatch && modelMatch && avgExternalPrice > 0) {
          const priceDiff = Math.abs(internal.price - avgExternalPrice) / avgExternalPrice;
          if (priceDiff <= 0.25) {
            isMatched = true;
            console.log(`🎯 Matched (brand+model) internal: "${internal.title}" with ${external.source}`);
            break;
          }
        }
      }

      // Fallback: title similarity and competitive price
      if (!isMatched) {
        const internalWords = internal.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const externalWords = extTitle.split(/\s+/).filter(w => w.length > 3);
        const sharedWords = internalWords.filter(w => externalWords.includes(w));
        const similarity = sharedWords.length / Math.max(internalWords.length, externalWords.length);
        if (similarity > 0.4 && avgExternalPrice > 0) {
          const priceDiff = Math.abs(internal.price - avgExternalPrice) / avgExternalPrice;
          if (priceDiff <= 0.2) {
            isMatched = true;
            console.log(`🎯 Matched internal listing: "${internal.title}" ($${internal.price}) with market avg $${avgExternalPrice.toFixed(2)}`);
            break;
          }
        }
      }
    }

    return {
      ...internal,
      isMatched,
    };
  });
}

/**
 * Generate contextual fallback results based on query keywords
 */
function generateFallbackResults(query: string): ExternalResult[] {
  const encodedQuery = encodeURIComponent(query);
  const queryLower = query.toLowerCase();
  const results: ExternalResult[] = [];

  // iPhone/Apple products
  if (queryLower.includes('iphone') || queryLower.includes('apple') || queryLower.includes('ipad') || queryLower.includes('macbook')) {
    results.push(
      {
        title: `${query} - Apple Official Store`,
        price: 699.00 + Math.floor(Math.random() * 500),
        source: 'Apple',
        url: `https://www.apple.com/search/${encodedQuery}`,
        image: null, // No hardcoded images - let fallback image show
        rating: 4.8,
        reviewsCount: 15000,
      },
      {
        title: `${query} - Amazon`,
        price: 649.00 + Math.floor(Math.random() * 400),
        source: 'Amazon',
        url: `https://www.amazon.com/s?k=${encodedQuery}`,
        image: null,
        rating: 4.5,
        reviewsCount: 25000,
      },
      {
        title: `${query} - Best Buy`,
        price: 679.00 + Math.floor(Math.random() * 450),
        source: 'Best Buy',
        url: `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedQuery}`,
        image: null,
        rating: 4.6,
        reviewsCount: 8500,
      },
      {
        title: `${query} - Target`,
        price: 659.00 + Math.floor(Math.random() * 420),
        source: 'Target',
        url: `https://www.target.com/s?searchTerm=${encodedQuery}`,
        image: null,
        rating: 4.4,
        reviewsCount: 6200,
      }
    );
  }
  // Nike/Shoes
  else if (queryLower.includes('nike') || queryLower.includes('shoe') || queryLower.includes('sneaker') || queryLower.includes('jordan')) {
    results.push(
      {
        title: `${query} - Nike Official`,
        price: 89.99 + Math.floor(Math.random() * 100),
        source: 'Nike',
        url: `https://www.nike.com/search?q=${encodedQuery}`,
        image: null,
        rating: 4.6,
        reviewsCount: 8500,
      },
      {
        title: `${query} - StockX`,
        price: 120.00 + Math.floor(Math.random() * 200),
        source: 'StockX',
        url: `https://stockx.com/search?s=${encodedQuery}`,
        image: null,
        rating: 4.7,
        reviewsCount: 12000,
      },
      {
        title: `${query} - GOAT`,
        price: 115.00 + Math.floor(Math.random() * 180),
        source: 'GOAT',
        url: `https://www.goat.com/search?query=${encodedQuery}`,
        image: null,
        rating: 4.6,
        reviewsCount: 9500,
      },
      {
        title: `${query} - Amazon`,
        price: 79.99 + Math.floor(Math.random() * 80),
        source: 'Amazon',
        url: `https://www.amazon.com/s?k=${encodedQuery}`,
        image: null,
        rating: 4.4,
        reviewsCount: 18000,
      }
    );
  }
  // Default/General products
  else {
    results.push(
      {
        title: `${query} - Amazon`,
        price: 49.99 + Math.floor(Math.random() * 200),
        source: 'Amazon',
        url: `https://www.amazon.com/s?k=${encodedQuery}`,
        image: null,
        rating: 4.5,
        reviewsCount: 15000,
      },
      {
        title: `${query} - eBay`,
        price: 45.99 + Math.floor(Math.random() * 180),
        source: 'eBay',
        url: `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}`,
        image: null,
        rating: 4.3,
        reviewsCount: 12000,
      },
      {
        title: `${query} - Walmart`,
        price: 39.99 + Math.floor(Math.random() * 150),
        source: 'Walmart',
        url: `https://www.walmart.com/search?q=${encodedQuery}`,
        image: null,
        rating: 4.2,
        reviewsCount: 8000,
      },
      {
        title: `${query} - Target`,
        price: 44.99 + Math.floor(Math.random() * 160),
        source: 'Target',
        url: `https://www.target.com/s?searchTerm=${encodedQuery}`,
        image: null,
        rating: 4.4,
        reviewsCount: 6500,
      }
    );
  }

  return results.slice(0, 8);
}

/**
 * Extract image from search result - comprehensive extraction checking ALL possible fields
 */
function extractImage(item: any): string | null {
  if (!item) return null;
  
  // Serper shopping API fields (check these first)
  const shoppingFields = ['imageUrl', 'image', 'thumbnail', 'thumbnailUrl', 'productImage', 'photo', 'picture'];
  for (const field of shoppingFields) {
    const value = item[field];
    if (value && typeof value === 'string' && value.startsWith('http')) {
      return value;
    }
  }
  
  // Check nested image objects
  if (item.image && typeof item.image === 'object') {
    if (item.image.url && typeof item.image.url === 'string' && item.image.url.startsWith('http')) {
      return item.image.url;
    }
    if (item.image.src && typeof item.image.src === 'string' && item.image.src.startsWith('http')) {
      return item.image.src;
    }
  }
  
  // Google Custom Search pagemap fields
  if (item.pagemap) {
    // Product images (best quality)
    if (item.pagemap.product?.[0]?.image && typeof item.pagemap.product[0].image === 'string' && item.pagemap.product[0].image.startsWith('http')) {
      return item.pagemap.product[0].image;
    }
    // CSE images
    if (item.pagemap.cse_image?.[0]?.src && typeof item.pagemap.cse_image[0].src === 'string' && item.pagemap.cse_image[0].src.startsWith('http')) {
      return item.pagemap.cse_image[0].src;
    }
    // Metatags
    if (item.pagemap.metatags?.[0]) {
      const meta = item.pagemap.metatags[0];
      if (meta['og:image'] && typeof meta['og:image'] === 'string' && meta['og:image'].startsWith('http')) {
        return meta['og:image'];
      }
      if (meta['twitter:image'] && typeof meta['twitter:image'] === 'string' && meta['twitter:image'].startsWith('http')) {
        return meta['twitter:image'];
      }
      if (meta['image'] && typeof meta['image'] === 'string' && meta['image'].startsWith('http')) {
        return meta['image'];
      }
    }
    // Imageobject
    if (item.pagemap.imageobject?.[0]?.content && typeof item.pagemap.imageobject[0].content === 'string' && item.pagemap.imageobject[0].content.startsWith('http')) {
      return item.pagemap.imageobject[0].content;
    }
  }
  
  // Check for image arrays
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = item.images[0];
    if (typeof firstImage === 'string' && firstImage.startsWith('http')) {
      return firstImage;
    }
    if (firstImage && typeof firstImage === 'object') {
      if (firstImage.url && typeof firstImage.url === 'string' && firstImage.url.startsWith('http')) {
        return firstImage.url;
      }
      if (firstImage.src && typeof firstImage.src === 'string' && firstImage.src.startsWith('http')) {
        return firstImage.src;
      }
    }
  }
  
  return null;
}

/**
 * Real internet-wide search using Google search results
 */
async function searchExternalInternet(query: string): Promise<ExternalResult[]> {
  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (serpApiKey) {
    try {
      // PRIORITY 1: Google Shopping search via SerpAPI
      const params = new URLSearchParams({
        engine: 'google_shopping',
          q: query,
        api_key: serpApiKey,
        num: '20', // Fetch more to ensure diverse sources
        gl: 'us',
        hl: 'en',
      });
      
      const shoppingResponse = await fetch(`https://serpapi.com/search?${params.toString()}`, {
        method: 'GET',
      });

      if (shoppingResponse.ok) {
        const shoppingData = await shoppingResponse.json();
        const shoppingResults = shoppingData.shopping_results || [];
        
        console.log('🛒 SerpAPI Shopping response:', Object.keys(shoppingData));
        console.log('🛒 Shopping results count:', shoppingResults.length);
        
        if (shoppingResults.length > 0) {
          console.log('🛒 First item:', JSON.stringify(shoppingResults[0], null, 2));
          
          const results = shoppingResults.map((item: any) => {
            // SerpAPI provides direct product links (no Google redirects!)
            const productUrl = item.product_link || item.link || '';
            
            // Get source name (e.g., "Nike", "Amazon", "eBay")
            let source = item.source || 'Unknown';
            // Clean up source name
            source = source.replace('.com', '').replace('.', '').trim();
            source = source.charAt(0).toUpperCase() + source.slice(1);
            
            // SerpAPI uses 'thumbnail' field for images
            const imageUrl = item.thumbnail || null;
            
            // SerpAPI provides extracted_price as a number (already parsed!)
            const price = item.extracted_price || 0;
            
            // Get rating and reviews
            const rating = item.rating || null;
            const reviewsCount = item.reviews || null;
            
            // Log for debugging
            console.log('📦 Product:', item.title);
            console.log('   Source:', source);
            console.log('   URL:', productUrl);
            console.log('   Price:', price);
            console.log('   Rating:', rating);
            console.log('   Reviews:', reviewsCount);
            console.log('   Image:', imageUrl ? '✅' : '❌');
            
            return {
              title: item.title || '',
              price: price,
              source: source,
              url: productUrl,
              image: imageUrl,
              rating: rating,
              reviewsCount: reviewsCount,
            };
          }).filter((item: ExternalResult) => 
            item.title && 
            item.url && 
            (item.url.startsWith('https://') || item.url.startsWith('http://'))
          );
          
          if (results.length > 0) {
            // Filter for major marketplaces only
            const majorMarketplaces = [
              'amazon', 'ebay', 'walmart', 'target', 'bestbuy', 'best buy',
              'apple', 'nike', 'adidas', 'google', 'microsoft', 'samsung',
              'home depot', 'homedepot', 'lowes', 'costco', 'macys', "macy's",
              'nordstrom', 'newegg', 'bhphotovideo', 'b&h', 'adorama'
            ];
            
            // Separate major marketplace results from others
            const majorResults = results.filter(result => {
              const sourceLower = result.source.toLowerCase();
              return majorMarketplaces.some(market => sourceLower.includes(market));
            });
            
            const otherResults = results.filter(result => {
              const sourceLower = result.source.toLowerCase();
              return !majorMarketplaces.some(market => sourceLower.includes(market));
            });
            
            console.log(`🏪 Found ${majorResults.length} results from major marketplaces, ${otherResults.length} from other sources`);
            
            // Diversify sources - pick max 1 from each source
            const diverseResults: ExternalResult[] = [];
            const sourceCount = new Map<string, number>();
            
            // First, add results from major marketplaces
            for (const result of majorResults) {
              const currentCount = sourceCount.get(result.source) || 0;
              if (currentCount < 1) { // Max 1 per source
                diverseResults.push(result);
                sourceCount.set(result.source, currentCount + 1);
              }
              if (diverseResults.length >= 4) break; // Target 4 results
            }
            
            // If we have less than 4 from major marketplaces, fill with other sources
            if (diverseResults.length < 4) {
              console.log(`⚠️ Only ${diverseResults.length} from major marketplaces, adding from other sources...`);
              
              for (const result of otherResults) {
                const currentCount = sourceCount.get(result.source) || 0;
                if (currentCount < 1) {
                  diverseResults.push(result);
                  sourceCount.set(result.source, currentCount + 1);
                }
                if (diverseResults.length >= 4) break; // Limit to 4 total
              }
            }
            
            console.log(`✅ SerpAPI Shopping: ${diverseResults.length} diverse results from ${sourceCount.size} sources`);
            return diverseResults;
          }
        }

        // SerpAPI shopping returned no results: try generic Google search and map product-like results
        try {
          const googleParams = new URLSearchParams({
            engine: 'google',
            q: query,
            api_key: serpApiKey,
            num: '10',
            gl: 'us',
            hl: 'en',
          });
          const googleResponse = await fetch(`https://serpapi.com/search?${googleParams.toString()}`);
          if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            const organic = googleData.organic_results || [];
            const mapped: ExternalResult[] = organic.slice(0, 8).map((item: any) => ({
              title: item.title || '',
              price: extractPriceFromSnippet(item.snippet) || 0,
              source: extractSource(item.link) || 'Web',
              url: extractActualUrl(item.link) || item.link || '',
              image: extractImage(item),
              rating: null,
              reviewsCount: null,
            })).filter((r: ExternalResult) => r.title && r.url && (r.url.startsWith('https') || r.url.startsWith('http')));
            if (mapped.length > 0) {
              console.log(`✅ SerpAPI Google fallback: ${mapped.length} results`);
              return mapped;
            }
          }
        } catch (fallbackErr) {
          console.error('SerpAPI Google fallback error:', fallbackErr);
        }
      } else {
        const errorText = await shoppingResponse.text();
        console.error('❌ SerpAPI response not OK:', shoppingResponse.status);
        console.error('❌ Error details:', errorText);
      }

    } catch (error) {
      console.error('❌ SerpAPI error:', error);
    }
  } else {
    console.log('⚠️ SERPAPI_API_KEY not configured');
  }

  // Fallback to Google Custom Search API (real results only)
  const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const googleCx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (googleApiKey && googleCx) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=8&safe=active`
      );

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];

        const results = items.slice(0, 8).map((item: any) => ({
          title: item.title || '',
          price: extractPriceFromSnippet(item.snippet) || 0,
          source: extractSource(item.link) || 'Unknown',
          url: extractActualUrl(item.link) || '',
          image: extractImage(item),
          rating: null,
          reviewsCount: null,
        })).filter((item: ExternalResult) => item.title && item.url && item.url.startsWith('https'));
        if (results.length > 0) return results;
      }
    } catch (error) {
      console.error('Google Custom Search API error:', error);
    }
  }

  // No fake data: return empty when no real external results are available
  return [];
}

function tryParseJson(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildDeterministicSummary(
  query: string,
  externalResults: ExternalResult[],
  internalResults: InternalResult[]
): SearchResponse['summary'] {
  const allPrices = [
    ...externalResults.map((r) => r.price).filter((p) => p > 0),
    ...internalResults.map((r) => r.price).filter((p) => p > 0),
  ];

  if (allPrices.length === 0) {
    return null;
  }

  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const average = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

  const cheapest =
    externalResults
      .filter((r) => r.price > 0)
      .sort((a, b) => a.price - b.price)[0] || null;

  const insights: string[] = [
    `Found ${externalResults.length} external results and ${internalResults.length} internal matches for "${query}".`,
    `Price range spans from $${min.toFixed(2)} to $${max.toFixed(2)} with an average of $${average.toFixed(2)}.`,
  ];

  if (cheapest) {
    insights.push(`Lowest external price: $${cheapest.price.toFixed(2)} at ${cheapest.source}.`);
  }

  const recommendations: string[] = [];
  if (cheapest) {
    recommendations.push(`Start with the $${cheapest.price.toFixed(2)} option on ${cheapest.source} for best value.`);
  }
  recommendations.push('Verify shipping costs and seller ratings before purchase.');
  recommendations.push('Compare at least 3 listings to confirm market price.');

  return {
    overview: `Live pricing summary for "${query}".`,
    priceRange: { min, max, average },
    topRecommendations: recommendations,
    marketInsights: insights,
  };
}

/**
 * Build search summary: priceRange always from data; overview/recommendations/insights from Gemini when possible, else deterministic.
 */
async function buildSummary(
  query: string,
  externalResults: ExternalResult[],
  internalResults: InternalResult[]
): Promise<SearchResponse['summary']> {
  const deterministic = buildDeterministicSummary(query, externalResults, internalResults);
  if (!deterministic) return null;

  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!geminiApiKey) return deterministic;

  const externalSnippet = externalResults.slice(0, 6).map(r => `${r.title} ($${r.price}, ${r.source})`).join('\n');
  const internalSnippet = internalResults.slice(0, 4).map(r => `${r.title} ($${r.price})`).join('\n');
  const hasInternalMatches = internalResults.some(r => r.isMatched);

  const prompt = `You are a shopping search assistant. For the search "${query}" we have:
External results: ${externalResults.length}. Sample: ${externalSnippet || 'none'}
Our marketplace: ${internalResults.length}. Sample: ${internalSnippet || 'none'}
${hasInternalMatches ? 'We have matching listings on our marketplace for this product.' : ''}

Reply with ONLY a JSON object (no markdown, no code block) with exactly:
{"overview": "1-2 sentences summarizing what we found and whether prices look typical.", "topRecommendations": ["short bullet 1", "short bullet 2", "short bullet 3"], "marketInsights": ["insight 1", "insight 2"]}
Keep each string brief. If we have matching items on our marketplace, mention it in overview or recommendations.`;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.FAST });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = (text || '').replace(/```json\n?|\n?```/g, '').trim();
    const json = tryParseJson(cleaned);
    if (json && typeof json.overview === 'string' && Array.isArray(json.topRecommendations) && Array.isArray(json.marketInsights)) {
      return {
        overview: json.overview,
        priceRange: deterministic.priceRange,
        topRecommendations: json.topRecommendations.slice(0, 4),
        marketInsights: json.marketInsights.slice(0, 4),
      };
    }
  } catch (err) {
    console.warn('Gemini summary fallback to deterministic:', err);
  }
  return deterministic;
}

function extractPrice(priceStr: string | number | undefined): number {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return 0;
  const match = priceStr.toString().match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return 0;
}

function extractPriceFromSnippet(snippet: string | undefined): number {
  if (!snippet) return 0;
  const priceMatch = snippet.match(/\$?([\d,]+\.?\d*)/);
  if (priceMatch) {
    return parseFloat(priceMatch[1].replace(/,/g, ''));
  }
  return 0;
}

/**
 * Extract the actual product URL from Google redirect URLs
 * Google often wraps URLs like: https://www.google.com/url?q=https://amazon.com/product&...
 */
function extractActualUrl(url: string | undefined): string {
  if (!url) return '';
  
  try {
    // Check if it's a Google redirect URL
    if (url.includes('google.com/url?') || url.includes('google.com/shopping/product')) {
      const urlObj = new URL(url);
      
      // Try to extract the actual destination from 'q' parameter
      const actualUrl = urlObj.searchParams.get('q');
      if (actualUrl) {
        console.log('🔗 Extracted direct URL from Google redirect:', actualUrl);
        return actualUrl;
      }
      
      // If it's a Google Shopping product page, try to find the merchant link
      // These usually redirect, but we'll use the original for now
      console.log('⚠️ Google Shopping URL detected, using as-is:', url);
    }
    
    return url;
  } catch (error) {
    console.error('Error extracting URL:', error);
    return url;
  }
}

function extractSource(url: string | undefined): string {
  if (!url) return 'Unknown';
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
}

