import { NextRequest, NextResponse } from "next/server";
import { CreateListingInput } from "@/lib/types/firestore";
import { calculateDistance } from "@/lib/location";

// Import firestore services dynamically to avoid webpack issues
async function getFirestoreServices() {
  try {
    const { firestoreServices } = await import("@/lib/services/firestore");
    return firestoreServices;
  } catch (err) {
    console.error('Failed to import firestore services:', err);
    throw new Error('Database services not available');
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 1 minute for better performance

export async function GET(req: NextRequest) {
  try {
    const firestoreServices = await getFirestoreServices();
    
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const condition = url.searchParams.get('condition') || undefined;
    const min = url.searchParams.get('min') ? Number(url.searchParams.get('min')) : undefined;
    const max = url.searchParams.get('max') ? Number(url.searchParams.get('max')) : undefined;
    const location = url.searchParams.get('location') || undefined;
    const maxDistance = url.searchParams.get('maxDistance') ? Number(url.searchParams.get('maxDistance')) : undefined;
    const userLat = url.searchParams.get('userLat') ? Number(url.searchParams.get('userLat')) : undefined;
    const userLng = url.searchParams.get('userLng') ? Number(url.searchParams.get('userLng')) : undefined;
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 20;
    const sort = url.searchParams.get('sort') || 'recent';

    const filters = {
      keyword: q,
      category: category,
      condition: condition,
      minPrice: min,
      maxPrice: max,
      location: location,
      maxDistance: maxDistance,
      userCoordinates: userLat && userLng ? { lat: userLat, lng: userLng } : undefined,
    };


    const sortOptions = {
      field: sort === 'priceAsc' || sort === 'priceDesc' ? 'price' : 'createdAt',
      direction: sort === 'priceAsc' ? 'asc' as const : 'desc' as const,
    };

    // Increase limit for keyword searches to ensure we have enough data to search through
    const effectiveLimit = filters.keyword ? Math.max(limit * 3, 50) : limit;
    
    const paginationOptions = {
      page,
      limit: effectiveLimit,
    };

    const result = await firestoreServices.listings.searchListings(filters, sortOptions, paginationOptions);
      
    // Apply client-side filtering for features not supported by Firestore
    let filteredData = [...result.items];
    
    // Apply keyword search (client-side filtering)
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filteredData = filteredData.filter(listing => 
        listing.title.toLowerCase().includes(keyword) ||
        listing.description.toLowerCase().includes(keyword)
      );
    }
    
    // Apply location filtering if user coordinates are provided (still needed as this can't be done at DB level)
    if (filters.userCoordinates && filters.maxDistance) {
      filteredData = filteredData.filter(listing => {
        if (!(listing as any).location?.coordinates) return false;
        
        const distance = calculateDistance(
          filters.userCoordinates!.lat,
          filters.userCoordinates!.lng,
          (listing as any).location.coordinates.lat,
          (listing as any).location.coordinates.lng
        );
        
        return distance <= filters.maxDistance!;
      });
    }
    
    // Transform FirestoreListing to SimpleListing format and filter out placeholder listings
    const transformedItems = filteredData
      .filter(listing => {
        // Filter out placeholder listings
        return listing.title !== 'AI Analyzing...' && 
               listing.description !== 'AI is analyzing your photos...' &&
               listing.price > 0;
      })
      .map(listing => ({
        id: (listing as any).id, // FirestoreListing & { id: string }
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        photos: listing.images || [],
        createdAt: listing.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: listing.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        sellerId: listing.sellerId,
        location: undefined, // Add location if available
      }));

    // Apply final pagination to return the correct number of results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = transformedItems.slice(startIndex, endIndex);

    const response = NextResponse.json({
      data: paginatedItems,
      pagination: {
        page: page,
        limit: limit,
        total: transformedItems.length,
        hasMore: endIndex < transformedItems.length,
      },
    });
    
    // Add aggressive caching headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    response.headers.set('CDN-Cache-Control', 'public, max-age=60');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=60');
    return response;
  } catch (error) {
    console.error('Error fetching listings:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('index')) {
        return NextResponse.json({ 
          error: 'Database configuration in progress. Please try again in a moment.',
          code: 'INDEX_REQUIRED'
        }, { status: 503 });
      }
      if (error.message.includes('permission')) {
        return NextResponse.json({ 
          error: 'Access denied. Please check your permissions.',
          code: 'PERMISSION_DENIED'
        }, { status: 403 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch listings. Please try again later.',
      code: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const body = await req.json() as CreateListingInput;
    
    // Basic validation
    if (!body.title || !body.description || typeof body.price !== 'number' || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const firestoreServices = await getFirestoreServices();

    const listingData = {
      ...body,
      sellerId: userId,
      inventory: body.inventory || 1,
      currency: body.currency || 'USD',
      condition: body.condition || 'good',
    };
    
    const listingId = await firestoreServices.listings.createListing(listingData);
    const listing = await firestoreServices.listings.getListing(listingId);
    
    return NextResponse.json({ id: listingId, ...listing }, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating listing:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ error: `Failed to create listing: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
