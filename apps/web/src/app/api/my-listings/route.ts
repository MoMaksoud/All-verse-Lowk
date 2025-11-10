import { NextRequest, NextResponse } from 'next/server';
import { ListingService } from '@/lib/firestore';
import { withApi } from '@/lib/withApi';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest & { userId: string }) => {
  try {
    const listings = await ListingService.getUserListings(request.userId);
    
    // Transform the data to match the expected format
    const transformedListings = listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      category: listing.category,
      photos: listing.images || [],
      createdAt: listing.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: listing.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      sellerId: listing.sellerId,
      status: listing.status || 'active',
      location: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: transformedListings,
      total: transformedListings.length
    });

  } catch (error) {
    console.error('Error fetching user listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
});
