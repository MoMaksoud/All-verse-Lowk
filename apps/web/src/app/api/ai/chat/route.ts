import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { assertTokenBudget, addUsage } from '@/lib/aiUsage';
import { withApi } from '@/lib/withApi';
import { getAdminStorage } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_AI_DAILY_TOKENS || 5000);
const MAX_OUT_TOKENS = 256;

/**
 * Fetch the first image from Firebase Storage for a listing
 * Images are stored at: listing-photos/{userId}/{listingId}/ or listing-photos/{userId}/temp-{userId}-{timestamp}/
 */
async function getListingImage(listingId: string, userId?: string, existingImageUrl?: string): Promise<string | null> {
  // If listing already has a valid image URL, use it
  if (existingImageUrl && typeof existingImageUrl === 'string') {
    const trimmed = existingImageUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      console.log(`✅ Using existing image URL for listing ${listingId}`);
      return trimmed;
    }
  }
  
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    
    const pathsToTry: string[] = [];
    
    // Try direct path with userId: listing-photos/{userId}/{listingId}/
    if (userId) {
      pathsToTry.push(`listing-photos/${userId}/${listingId}/`);
    }
    
    // Try without userId: listing-photos/{listingId}/
    pathsToTry.push(`listing-photos/${listingId}/`);
    
    // Try temp folder patterns if userId is available
    if (userId) {
      pathsToTry.push(`listing-photos/${userId}/temp-${userId}-`);
    }
    
    for (const path of pathsToTry) {
      try {
        console.log(`🔍 Searching for images in: ${path}`);
        
        // For temp folder pattern, we need to list all folders
        if (path.includes('/temp-')) {
          const [allFiles] = await bucket.getFiles({ 
            prefix: path.substring(0, path.lastIndexOf('/') + 1),
            maxResults: 100
          });
          
          // Find files in any temp folder for this user
          const tempFiles = allFiles.filter(file => 
            file.name.includes('/temp-') && 
            (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || 
             file.name.endsWith('.png') || file.name.endsWith('.webp'))
          );
          
          if (tempFiles.length > 0) {
            const firstFile = tempFiles[0];
            
            try {
              await firstFile.makePublic();
            } catch (makePublicError: any) {
              console.log(`ℹ️ Could not make file public (may already be public)`);
            }
            
            const url = `https://storage.googleapis.com/${bucket.name}/${firstFile.name}`;
            console.log(`✅ Found image in temp folder:`, url);
            return url;
          }
        } else {
          // Regular path search
          const [files] = await bucket.getFiles({ prefix: path, maxResults: 1 });
          
          if (files && files.length > 0) {
            const firstFile = files[0];
            
            try {
              await firstFile.makePublic();
            } catch (makePublicError: any) {
              console.log(`ℹ️ Could not make file public (may already be public)`);
            }
            
            const url = `https://storage.googleapis.com/${bucket.name}/${firstFile.name}`;
            console.log(`✅ Found image for listing ${listingId} at ${path}:`, url);
            return url;
          }
        }
      } catch (pathError: any) {
        console.log(`⚠️ Error searching in ${path}:`, pathError?.message);
        continue;
      }
    }
    
    console.log(`⚠️ No image found for listing ${listingId}`);
    return null;
  } catch (err: any) {
    console.error(`❌ Error fetching image for listing ${listingId}:`, err?.message || err);
    return null;
  }
}

// Enhanced guardrails: Check if query is marketplace-related
const isOutOfScope = (s: string) => {
  const lower = (s || '').toLowerCase();
  // Block non-marketplace topics
  const blockedPatterns = /politic|news|program|code|crypto|vpn|religion|medical|legal|tax|homework|api key|bypass|hack|weather|sports|movie|music|recipe|cooking|travel|vacation|health|fitness|exercise|gym|workout/i;
  
  // Allow marketplace-related terms
  const marketplaceTerms = /buy|sell|purchase|product|item|listing|price|marketplace|shopping|cart|order|delivery|shipping|condition|category|brand|model|search|find|available|stock|inventory/i;
  
  // If it contains marketplace terms, allow it even if it has some blocked patterns
  if (marketplaceTerms.test(lower)) {
    return false;
  }
  
  // Otherwise, check for blocked patterns
  return blockedPatterns.test(lower);
};

// Helper to get firestore services
async function getFirestoreServices() {
  try {
    const { firestoreServices } = await import('@/lib/services/firestore');
    return firestoreServices;
  } catch (error) {
    console.error('Error loading firestore services:', error);
    throw new Error('Failed to load database services');
  }
}

export const POST = withApi(async (request: NextRequest & { userId: string }) => {
  console.log('🔵 AI Chat request received for user:', request.userId);
  
  try {
    // Check if Gemini API key is configured before processing
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is not configured');
      return NextResponse.json({
        response: 'AI service is not configured. Please contact support.',
        success: false,
        error: 'GEMINI_API_KEY missing'
      }, { status: 500 });
    }
    console.log('✅ Gemini API key found');

    // Parse request body
    const { message, mode = 'buyer', conversationHistory = [], mediaUrl, mediaType } = await request.json();
    console.log('✅ Request body parsed, message length:', message?.length, 'mediaUrl:', !!mediaUrl);

    // 2) Input guards
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }
    if (trimmed.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // 3) Marketplace-only scope guardrails
    if (isOutOfScope(trimmed)) {
      return NextResponse.json({
        success: true,
        response: 'I can only help with marketplace-related questions about buying, selling, listings, pricing, shipping, and products on AllVerse. Please ask me about items, listings, or selling tips.'
      });
    }

    // 4) Enforce daily token budget (precharge input + max output)
    const inputTokens = Math.ceil(trimmed.length / 4);
    const precharge = inputTokens + MAX_OUT_TOKENS;
    console.log('🔵 Checking token budget, precharge:', precharge);
    try {
      await assertTokenBudget(request.userId, precharge, DAILY_LIMIT);
      console.log('✅ Token budget check passed');
    } catch (error: any) {
      if (error?.message === 'TOKEN_LIMIT_EXCEEDED') {
        console.log('⚠️ Token limit exceeded');
        return NextResponse.json({
          success: false,
          response: 'Free daily AI limit reached. Try again tomorrow.'
        }, { status: 200 });
      }
      // For other errors, log but continue
      console.error('⚠️ Token budget check failed (continuing anyway):', error?.message);
    }

    // 5) Build conversation context safely (last 10 messages for context)
    const history = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10).map((m: any) => ({
          role: m?.role === 'user' ? 'user' : 'assistant',
          parts: [{ text: String(m?.content ?? '') }],
          content: String(m?.content ?? ''),
          mediaUrl: m?.mediaUrl,
          mediaType: m?.mediaType,
        }))
      : [];

    // 6) Fetch listings from database for buyer mode
    let listingsContext = '';
    let listingsMap: Map<string, any> = new Map();
    if (mode === 'buyer') {
      try {
        console.log('🔵 Fetching listings from database for buyer mode...');
        const firestoreServices = await getFirestoreServices();
        
        // Fetch active listings (limit to 50 most recent for context)
        const allListings = await firestoreServices.listings.searchListings(
          { isActive: true },
          { field: 'createdAt', direction: 'desc' }
        );
        
        if (allListings.items && allListings.items.length > 0) {
          // Store listings in a map for later use
          allListings.items.slice(0, 30).forEach((listing: any) => {
            const id = (listing as any).id || 'unknown';
            listingsMap.set(id, listing);
            // Also log first listing structure for debugging
            if (listingsMap.size === 1) {
              console.log('📋 Sample listing structure:', {
                id: id,
                title: listing.title,
                hasImages: !!listing.images,
                images: listing.images,
                imagesType: typeof listing.images,
                imagesIsArray: Array.isArray(listing.images),
                hasPhotos: !!listing.photos,
                photos: listing.photos,
                allKeys: Object.keys(listing)
              });
            }
          });
          
          // Format listings as context for AI
          const listingsText = allListings.items
            .slice(0, 30) // Limit to 30 most relevant listings to avoid token limits
            .map((listing: any) => {
              const id = (listing as any).id || 'unknown';
              const imageUrl = listing.images?.[0] || listing.photos?.[0]?.url || listing.photos?.[0] || null;
              return `- ${listing.title} ($${listing.price}) - ${listing.category} - ${listing.condition || 'N/A'} condition - Image: ${imageUrl || 'null'} - ID: ${id}`;
            })
            .join('\n');
          
          listingsContext = `\n\nCurrent available listings in our marketplace:\n${listingsText}\n\nWhen answering buyer questions, reference these actual listings. Only mention listings that exist in the list above. If no listings match the query, say so honestly. When returning listing recommendations in JSON format, use the exact Image URL and ID from the listings above. Return format: {"message": "text here", "type": "listings", "items": [{"title": "...", "price": 123, "image": "...", "url": "/listings/id"}]}`;
          console.log(`✅ Loaded ${allListings.items.length} listings for context`);
        } else {
          listingsContext = '\n\nNote: There are currently no active listings in the marketplace.';
          console.log('⚠️ No active listings found');
        }
      } catch (dbError: any) {
        console.error('⚠️ Error fetching listings (continuing without database context):', dbError?.message);
        // Continue without database context - AI will use general knowledge
        listingsContext = '\n\nNote: Unable to access current listings. Provide general guidance about marketplace products.';
      }
    }

    console.log('🔵 Calling Gemini API, mode:', mode, 'hasMedia:', !!mediaUrl);
    const responseText = await GeminiService.generateAIResponse(
      mode === 'seller' ? 'seller' : 'buyer',
      trimmed,
      history,
      listingsContext, // Pass listings context for buyer mode
      mediaUrl, // Pass media URL if present
      mediaType // Pass media type if present
    );
    console.log('✅ Gemini API response received, length:', responseText?.length);
    
    // Try to parse response as JSON to check for listings format
    let parsedResponse: any = null;
    try {
      // Try parsing the entire response
      parsedResponse = JSON.parse(responseText);
    } catch {
      // If not valid JSON, try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*"type"\s*:\s*"listings"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch {
          // Not valid JSON, continue with text response
        }
      }
    }
    
    // 8) Reconcile approximate output tokens
    const outputTokens = Math.ceil((responseText || '').length / 4);
    console.log('🔵 Updating usage, total tokens:', inputTokens + outputTokens);
    await addUsage(request.userId, inputTokens + outputTokens, precharge).catch(err => {
      console.error('⚠️ Usage update failed (non-blocking):', err?.message);
    });

    console.log('✅ Returning successful response');
    // If parsed response has listings format, post-process to fetch real images from Firebase Storage
    if (parsedResponse && parsedResponse.type === 'listings' && Array.isArray(parsedResponse.items)) {
      console.log(`🔍 Post-processing ${parsedResponse.items.length} listings from AI response`);
      
      // Replace image URLs with real Firebase Storage URLs
      const processedItems = await Promise.all(parsedResponse.items.map(async (item: any) => {
        // Extract listing ID from URL (format: /listings/abc123 or /listing/abc123)
        const urlMatch = item.url?.match(/\/(?:listings|listing)\/([^\/]+)/);
        let listingId = urlMatch ? urlMatch[1] : null;
        
        // Try to find listing by ID first
        let listing = listingId ? listingsMap.get(listingId) : null;
        
        // If not found by ID, try to find by title (fallback)
        if (!listing && item.title) {
          for (const [id, list] of listingsMap.entries()) {
            if (list.title === item.title) {
              listingId = id;
              listing = list;
              break;
            }
          }
        }
        
        if (listing && listingId) {
          // Fetch image directly from Firebase Storage
          // Images are stored at: listing-photos/{listingId}/ or listing-photos/{userId}/{listingId}/
          const userId = listing.sellerId;
          const imageUrl = await getListingImage(listingId, userId, listing.images?.[0]);
          
          console.log(`✅ Processed listing ${listingId}:`, {
            title: listing.title,
            price: listing.price,
            hasImage: !!imageUrl,
            imageUrl: imageUrl
          });
          
          return {
            title: listing.title,
            price: listing.price,
            image: imageUrl, // Real Firebase Storage URL or null - NO placeholder
            url: `/listings/${listingId}`
          };
        } else {
          console.log(`⚠️ Listing not found for:`, {
            url: item.url,
            listingId: listingId,
            title: item.title,
            availableIds: Array.from(listingsMap.keys()).slice(0, 3)
          });
          
          // Return original item but with null image (no placeholder)
          return {
            title: item.title,
            price: item.price,
            image: null, // NO placeholder - frontend handles null
            url: item.url || '/listings'
          };
        }
      }));
      
      parsedResponse.items = processedItems;
      return NextResponse.json({ response: parsedResponse, success: true });
    }
    return NextResponse.json({ response: responseText, success: true });

  } catch (error: any) {
    // Return a safe fallback message with 200 status so UI can display it
    const msg = error?.message || 'Internal error';
    const errorStack = error?.stack || '';
    
    // Log detailed error information for debugging
    console.error('❌ AI chat error:', {
      message: msg,
      stack: errorStack,
      userId: request.userId,
      timestamp: new Date().toISOString(),
      errorType: error?.constructor?.name || 'Unknown'
    });
    
    // Check for specific error types and provide better messages
    let userMessage = 'I encountered a temporary error. Please try again shortly.';
    let statusCode = 200; // Default to 200 so UI can display the error message
    
    if (msg.includes('GEMINI_API_KEY') || msg.includes('API key')) {
      userMessage = 'AI service is not configured. Please contact support.';
      console.error('❌ GEMINI_API_KEY is missing or invalid');
      statusCode = 500;
    } else if (msg.includes('TOKEN_LIMIT_EXCEEDED')) {
      userMessage = 'Free daily AI limit reached. Try again tomorrow.';
    } else if (msg.includes('quota') || msg.includes('429') || msg.includes('Too Many Requests')) {
      userMessage = 'AI service is temporarily unavailable due to high demand. Please try again in a moment.';
    } else if (msg.includes('Unauthorized') || msg.includes('401') || msg.includes('authentication')) {
      userMessage = 'Authentication failed. Please refresh the page and try again.';
      statusCode = 401;
    } else if (msg.includes('Firestore') || msg.includes('Firebase') || msg.includes('getAdminFirestore') || msg.includes('ERR_NAME_NOT_RESOLVED') || msg.includes('ERR_QUIC_PROTOCOL_ERROR')) {
      // Firestore/DNS errors - show generic error, not network error
      userMessage = 'I encountered a temporary database error. The AI can still help with general questions.';
      console.error('⚠️ Firestore/DNS error (non-critical, AI should still work):', msg);
    } else if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('model') || msg.includes('not found')) {
      // Model not found or API version issues
      userMessage = 'AI model configuration error. Please contact support.';
      console.error('⚠️ Model/API error:', msg);
    } else if ((msg.includes('network') || msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT')) && !msg.includes('Firestore') && !msg.includes('Firebase')) {
      // Only show network error if it's not a Firestore/Firebase error
      userMessage = 'Unable to connect to AI service. Please check your internet connection and try again.';
    }
    
    return NextResponse.json({
      response: userMessage,
      success: false,
      error: process.env.NODE_ENV === 'development' ? msg : undefined
    }, { status: statusCode });
  }
});