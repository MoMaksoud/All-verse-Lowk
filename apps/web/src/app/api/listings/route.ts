import { NextRequest, NextResponse } from "next/server";
import { firestoreServices } from "@/lib/services/firestore";
import { CreateListingInput } from "@/lib/types/firestore";
import { calculateDistance } from "@/lib/location";

export const runtime = "nodejs";
export const dynamic = "auto";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || undefined;
    const category = url.searchParams.get('category') || undefined;
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
      minPrice: min,
      maxPrice: max,
      location: location,
      maxDistance: maxDistance,
      userCoordinates: userLat && userLng ? { lat: userLat, lng: userLng } : undefined,
    };


    const sortOptions = {
      field: sort === 'priceAsc' ? 'price' : sort === 'priceDesc' ? 'price' : 'createdAt',
      direction: sort === 'priceAsc' ? 'asc' as const : 'desc' as const,
    };

    const paginationOptions = {
      page,
      limit,
    };

    const result = await firestoreServices.listings.searchListings(filters, sortOptions, paginationOptions);
      
    // Apply location filtering if user coordinates are provided
    let filteredData = [...result.items];
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
      
    // Apply sorting
    let sortedData = [...filteredData];
    switch (sort) {
      case 'priceAsc':
        sortedData.sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        sortedData.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        // For now, sort by newest since we don't have ratings in SimpleListing
        sortedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'recent':
      default:
        sortedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    
    // Transform FirestoreListing to SimpleListing format
    const transformedItems = result.items.map(listing => ({
      id: listing.id,
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

    return NextResponse.json({
      data: transformedItems,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
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

    const listingData = {
      ...body,
      sellerId: userId,
      inventory: body.inventory || 1,
      currency: body.currency || 'USD',
      condition: body.condition || 'good',
    };

    const listingId = await firestoreServices.listings.createListing(listingData);
    const listing = await firestoreServices.listings.getListing(listingId);
    
    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}
