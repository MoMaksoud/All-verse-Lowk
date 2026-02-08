import { NextRequest, NextResponse } from "next/server";
import { CreateListingInput } from "@/lib/types/firestore";
import { withApi } from "@/lib/withApi";
import { ProfileService } from "@/lib/firestore";

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
    const sellerId = url.searchParams.get('sellerId') || undefined;
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 20;
    const sort = url.searchParams.get('sort') || 'newest';

    // Map sort options to database fields
    let sortField: string;
    let sortDirection: 'asc' | 'desc';
    
    switch (sort) {
      case 'low-to-high':
        sortField = 'price';
        sortDirection = 'asc';
        break;
      case 'high-to-low':
        sortField = 'price';
        sortDirection = 'desc';
        break;
      case 'newest':
        sortField = 'createdAt';
        sortDirection = 'desc';
        break;
      case 'oldest':
        sortField = 'createdAt';
        sortDirection = 'asc';
        break;
      default:
        sortField = 'createdAt';
        sortDirection = 'desc';
    }

    // When filtering by sellerId (profile page), show all listings including inactive ones
    const filters = {
      keyword: q,
      category: category,
      condition: condition,
      minPrice: min,
      maxPrice: max,
      sellerId: sellerId,
      // For profile pages, don't filter by isActive (show all listings)
      // For general browsing, only show active listings
      isActive: sellerId ? undefined : true,
    };

    const sortOptions = {
      field: sortField,
      direction: sortDirection,
    };

    // Fetch ALL listings with filters and sorting applied at database level
    // Then apply keyword filtering (client-side, as Firestore doesn't support full-text search)
    // Then paginate
    const result = await firestoreServices.listings.searchListings(filters, sortOptions);
      
    // Apply keyword search (client-side, as Firestore doesn't support full-text search)
    let filteredData = [...result.items];
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filteredData = filteredData.filter(listing => 
        listing.title.toLowerCase().includes(keyword) ||
        listing.description.toLowerCase().includes(keyword)
      );
    }

    // Filter out placeholder listings and old sold listings (older than 3 days)
    // BUT: When filtering by sellerId (profile page), show ALL listings including sold ones
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const isProfileView = !!sellerId; // If sellerId is provided, this is a profile page view
    
    const transformedItems = filteredData
      .filter(listing => {
        // Filter out placeholder listings
        if (listing.title === 'AI Analyzing...' || 
            listing.description === 'AI is analyzing your photos...' ||
            listing.price <= 0) {
          return false;
        }

        // Check if item is sold (either explicitly marked or inventory is 0)
        const isSold = (listing.sold ?? false) === true || listing.inventory === 0;

        // Filter out sold listings older than 3 days ONLY if NOT viewing a profile
        // On profile pages, show all listings including sold ones
        if (!isProfileView && isSold && listing.soldAt) {
          // Safe date conversion: check for toDate method first, then Date instance
          const soldAtValue = listing.soldAt as any;
          const soldDate = soldAtValue?.toDate ? soldAtValue.toDate() : (soldAtValue && typeof soldAtValue === 'object' && soldAtValue instanceof Date ? soldAtValue : null);
          
          if (soldDate && soldDate < threeDaysAgo) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by sold status first (unsold items first), then by selected sort field
        // Treat items with inventory === 0 as sold even if sold field is not set
        const aSold = ((a.sold ?? false) === true || a.inventory === 0) ? 1 : 0;
        const bSold = ((b.sold ?? false) === true || b.inventory === 0) ? 1 : 0;
        if (aSold !== bSold) {
          return aSold - bSold; // 0 (unsold) comes before 1 (sold)
        }
        
        // Then sort by the selected field
        let aValue: number;
        let bValue: number;
        
        if (sortField === 'price') {
          aValue = a.price;
          bValue = b.price;
        } else {
          // createdAt sorting - safe conversion without nested instanceof
          const aCreatedAt = a.createdAt as any;
          const bCreatedAt = b.createdAt as any;
          
          const aDate = aCreatedAt?.toDate ? aCreatedAt.toDate() : (aCreatedAt && typeof aCreatedAt === 'object' && aCreatedAt instanceof Date ? aCreatedAt : null);
          const bDate = bCreatedAt?.toDate ? bCreatedAt.toDate() : (bCreatedAt && typeof bCreatedAt === 'object' && bCreatedAt instanceof Date ? bCreatedAt : null);
          
          const aTime = aDate?.getTime?.() ?? 0;
          const bTime = bDate?.getTime?.() ?? 0;
          
          aValue = aTime;
          bValue = bTime;
        }
        
        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      })
      .map(listing => {
        // Safe date normalization: check for toDate method first, then Date instance
        const createdAtValue = listing.createdAt as any;
        const updatedAtValue = listing.updatedAt as any;
        
        const createdAtDate = createdAtValue?.toDate ? createdAtValue.toDate() : (createdAtValue && typeof createdAtValue === 'object' && createdAtValue instanceof Date ? createdAtValue : null);
        const updatedAtDate = updatedAtValue?.toDate ? updatedAtValue.toDate() : (updatedAtValue && typeof updatedAtValue === 'object' && updatedAtValue instanceof Date ? updatedAtValue : null);
        
        // Convert to ISO strings or use fallback
        const createdAt = createdAtDate?.toISOString?.() || new Date().toISOString();
        const updatedAt = updatedAtDate?.toISOString?.() || new Date().toISOString();
        
        // Normalize image paths: ensure all photos are valid URLs or default to placeholder
        const normalizedPhotos = (listing.images || []).map((photo: string) => {
          if (!photo || typeof photo !== 'string') return '/default-avatar.png';
          // If it starts with / or http, use as-is
          if (photo.startsWith('/') || photo.startsWith('http://') || photo.startsWith('https://')) {
            return photo;
          }
          // Otherwise, use default placeholder
          return '/default-avatar.png';
        });
        
        return {
          id: (listing as any).id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          category: listing.category,
          photos: normalizedPhotos.length > 0 ? normalizedPhotos : ['/default-avatar.png'],
          createdAt: createdAt,
          updatedAt: updatedAt,
          sellerId: listing.sellerId,
          // Treat items with inventory === 0 as sold even if sold field is not set
          sold: (listing.sold ?? false) === true || listing.inventory === 0,
        };
      });

    // Apply pagination after filtering and sorting
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = transformedItems.slice(startIndex, endIndex);

    // Batch-fetch seller profiles to avoid N+1 client requests
    const uniqueSellerIds = [...new Set(paginatedItems.map((i) => i.sellerId).filter(Boolean))] as string[];
    const profileMap = new Map<string, { username?: string; profilePicture?: string }>();
    await Promise.all(
      uniqueSellerIds.map(async (uid) => {
        try {
          const profile = await ProfileService.getProfile(uid);
          if (profile) {
            profileMap.set(uid, {
              username: profile.username || "Marketplace User",
              profilePicture: profile.profilePicture || undefined,
            });
          } else {
            profileMap.set(uid, { username: "Marketplace User" });
          }
        } catch {
          profileMap.set(uid, { username: "Marketplace User" });
        }
      })
    );

    const itemsWithSeller = paginatedItems.map((item) => ({
      ...item,
      sellerProfile: item.sellerId ? profileMap.get(item.sellerId) ?? null : null,
    }));

    const response = NextResponse.json({
      data: itemsWithSeller,
      pagination: {
        page: page,
        limit: limit,
        total: transformedItems.length,
        hasMore: endIndex < transformedItems.length,
      },
    });
    
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
