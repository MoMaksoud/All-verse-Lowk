import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/withApi";
import { success, error } from "@/lib/response";
import { badRequest, notFound } from "@/lib/errors";
import { UpdateListingInput } from "@/lib/types/firestore";
import { FirebaseCleanupService } from "@/lib/firebaseCleanup";

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

export const GET = withApi(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const firestoreServices = await getFirestoreServices();
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
    
    const firestoreServices = await getFirestoreServices();
    
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
    
    if (!updatedListing) {
      return error(notFound("Listing not found after update"));
    }
    
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
    return error(badRequest(`Failed to update listing: ${err instanceof Error ? err.message : 'Unknown error'}`));
  }
});

export const DELETE = withApi(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      console.error('❌ No user ID provided');
      return error(badRequest("User ID is required"));
    }

    console.log('🗑️ Starting deletion for listing:', params.id, 'by user:', userId);

    // Use the comprehensive cleanup service
    const cleanupResult = await FirebaseCleanupService.deleteListingCompletely(params.id, userId);
    
    console.log('🧹 Cleanup result:', cleanupResult);
    
    if (cleanupResult.success) {
      return success({ 
        message: "Listing and all associated data deleted successfully",
        deletedPhotos: cleanupResult.deletedPhotos,
        warnings: cleanupResult.errors.length > 0 ? cleanupResult.errors : undefined
      });
    } else {
      console.error('❌ Cleanup failed:', cleanupResult.errors);
      return error(badRequest(`Failed to delete listing: ${cleanupResult.errors.join(', ')}`));
    }
  } catch (err) {
    console.error('❌ Error deleting listing:', err);
    console.error('❌ Full error object:', err);
    return error(badRequest(`Failed to delete listing: ${err instanceof Error ? err.message : 'Unknown error'}`));
  }
});