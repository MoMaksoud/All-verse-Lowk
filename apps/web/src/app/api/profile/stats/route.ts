import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest & { userId: string }) => {
  try {
    if (!request.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const adminDb = getAdminFirestore();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const userId = request.userId;

    // Count listings created by the user
    const listingsRef = adminDb.collection(COLLECTIONS.LISTINGS);
    const listingsQuery = listingsRef.where('sellerId', '==', userId);
    const listingsSnapshot = await listingsQuery.get();
    const listingsCount = listingsSnapshot.size;

    // Count sales (orders where user is the seller)
    // Note: Firestore doesn't support querying nested array fields directly,
    // so we need to fetch all orders and filter client-side
    const ordersRef = adminDb.collection(COLLECTIONS.ORDERS);
    const ordersSnapshot = await ordersRef.get();
    let salesCount = 0;
    
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      const items = orderData.items || [];
      // Check if any item in the order has this user as seller
      const hasSellerItems = items.some((item: any) => item.sellerId === userId);
      if (hasSellerItems) {
        salesCount++;
      }
    });

    // Count reviews - if reviews collection doesn't exist, return 0
    // For now, returning 0 as there's no reviews collection in COLLECTIONS
    const reviewsCount = 0;

    return NextResponse.json({
      listingsCount,
      salesCount,
      reviewsCount,
    });

  } catch (error) {
    console.error('Error fetching profile stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile stats' },
      { status: 500 }
    );
  }
});

