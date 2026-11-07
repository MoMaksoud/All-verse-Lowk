import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withApi } from '@/lib/withApi';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest & { userId: string }) => {
  try {
    // Admin SDK: the client SDK here has no user token, so Firestore rules hide the owner's inactive listings.
    const snap = await getAdminFirestore()
      .collection('listings')
      .where('sellerId', '==', request.userId)
      .get();
    const listings = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    const transformedListings = listings.map((listing: any) => {
      const isSold = (listing.sold ?? false) === true || listing.inventory === 0;
      return {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        photos: listing.images || [],
        createdAt: listing.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: listing.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        sellerId: listing.sellerId,
        status: isSold ? 'sold' : (listing.status || 'active'),
        sold: isSold,
        soldThroughAllVerse: isSold ? listing.soldThroughAllVerse === true : undefined,
      };
    });

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
