import { NextRequest, NextResponse } from "next/server";
import { CreateListingInput } from "@/lib/types/firestore";
import { withApi } from "@/lib/withApi";

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
export const revalidate = 10; // Cache for 10 seconds

export async function GET(req: NextRequest) {
  try {
    const firestoreServices = await getFirestoreServices();
    
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const condition = url.searchParams.get('condition') || undefined;
    const min = url.searchParams.get('min') ? Number(url.searchParams.get('min')) : undefined;
    const max = url.searchParams.get('max') ? Number(url.searchParams.get('max')) : undefined;
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 20;
    const sort = url.searchParams.get('sort') || 'recent';

    const filters = {
      keyword: q,
      category: category,
      condition: condition,
      minPrice: min,
      maxPrice: max,
    };


    const sortOptions = {
      field: sort === 'priceAsc' || sort === 'priceDesc' ? 'price' : 'createdAt',
      direction: sort === 'priceAsc' ? 'asc' as const : 'desc' as const,
    };

    // Fetch a large batch to ensure we have all items for client-side pagination
    // Firestore limit is 1000, so we'll fetch up to that many
    // We always fetch from page 1 since we'll paginate client-side after filtering
    const fetchLimit = 1000;
    
    const paginationOptions = {
      page: 1, // Always fetch from page 1 since we'll paginate client-side
      limit: fetchLimit,
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
    
    // Transform FirestoreListing to SimpleListing format and filter out placeholder listings
    const transformedItems = filteredData
      .filter(listing => {
        // Filter out placeholder listings
        if (listing.title === 'AI Analyzing...' || 
            listing.description === 'AI is analyzing your photos...' ||
            listing.price <= 0) {
          return false;
        }

        // Filter out sold listings older than 2 days
        if (listing.soldAt) {
          // Handle Firestore Timestamp - check if it has toDate method
          let soldDate: Date;
          if (listing.soldAt && typeof listing.soldAt === 'object' && 'toDate' in listing.soldAt && typeof (listing.soldAt as any).toDate === 'function') {
            soldDate = (listing.soldAt as any).toDate();
          } else if (listing.soldAt instanceof Date) {
            soldDate = listing.soldAt;
          } else {
            // If it's a number (timestamp) or string, convert it via unknown first
            soldDate = new Date(listing.soldAt as unknown as string | number);
          }
          
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          
          // If sold more than 2 days ago, hide it from marketplace
          if (soldDate < twoDaysAgo) {
            return false;
          }
        }

        return true;
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
    
    // Add caching headers with shorter TTL
    response.headers.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
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

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const body = await req.json() as CreateListingInput;
    
    // Basic validation
    if (!body.title || !body.description || typeof body.price !== 'number' || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const firestoreServices = await getFirestoreServices();

    const listingData = {
      ...body,
      sellerId: req.userId, // Use verified userId from token
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
});
