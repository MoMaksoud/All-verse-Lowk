import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { firestoreServices } from "@/lib/services/firestore";
import { success, error } from "@/lib/response";
import { badRequest, notFound } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const listing = await firestoreServices.listings.getListing(params.id);
    
    if (!listing) {
      return error(notFound("Listing not found"));
    }

    // Transform FirestoreListing to SimpleListing format
    const simpleListing = {
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
    };

    return success(simpleListing);
  } catch (err) {
    console.error('Error fetching listing:', err);
    return error(badRequest("Failed to fetch listing"));
  }
});