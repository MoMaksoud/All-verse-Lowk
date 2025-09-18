import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { firestoreServices } from "@/lib/services/firestore";
import { success, error } from "@/lib/response";
import { badRequest, notFound } from "@/lib/errors";
import { UpdateListingInput } from "@/lib/types/firestore";

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
    };

    return success(simpleListing);
  } catch (err) {
    console.error('Error fetching listing:', err);
    return error(badRequest("Failed to fetch listing"));
  }
});

export const PUT = withApi(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return error(badRequest("User ID is required"));
    }

    const body = await req.json() as UpdateListingInput;
    
    // Get the existing listing to check ownership
    const existingListing = await firestoreServices.listings.getListing(params.id);
    if (!existingListing) {
      return error(notFound("Listing not found"));
    }

    // Check if user owns this listing
    if (existingListing.sellerId !== userId) {
      return error(badRequest("You can only update your own listings"));
    }

    // Update the listing
    await firestoreServices.listings.updateListing(params.id, body);
    
    // Get the updated listing
    const updatedListing = await firestoreServices.listings.getListing(params.id);
    
    // Transform to SimpleListing format
    const simpleListing = {
      id: (updatedListing as any).id,
      title: updatedListing.title,
      description: updatedListing.description,
      price: updatedListing.price,
      category: updatedListing.category,
      photos: updatedListing.images || [],
      createdAt: updatedListing.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: updatedListing.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      sellerId: updatedListing.sellerId,
      location: undefined,
    };

    return success(simpleListing);
  } catch (err) {
    console.error('Error updating listing:', err);
    return error(badRequest("Failed to update listing"));
  }
});