import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/withApi";
import { success, error } from "@/lib/response";
import { badRequest, notFound } from "@marketplace/shared-logic";
import { UpdateListingInput } from "@/lib/types/firestore";
import { FirebaseCleanupService } from "@/lib/firebaseCleanup";
import { getListingAdmin, markAsSoldAdmin, updateListingAdmin } from "@/lib/server/adminListings";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { sendPushNotifications } from "@/lib/server/push-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const listing = await getListingAdmin(params.id);
    
    if (!listing) {
      return error(notFound("Listing not found"));
    }

    // Transform FirestoreListing to SimpleListing format
    // Treat items with inventory === 0 as sold even if sold field is not set
    const isSold = (listing.sold ?? false) === true || listing.inventory === 0;
    const simpleListing = {
      id: (listing as any).id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      category: listing.category,
      condition: listing.condition,
      brand: listing.brand,
      model: listing.model,
      size: (listing as any).size,
      photos: listing.images || [],
      images: listing.images || [],
      createdAt: listing.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: listing.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      sellerId: listing.sellerId,
      sold: isSold,
      soldThroughAllVerse: isSold ? (listing as any).soldThroughAllVerse === true : undefined,
      shipping: (listing as any).shipping ?? null,
    };

    return success(simpleListing);
  } catch (err) {
    console.error('Error fetching listing:', err);
    return error(badRequest("Failed to fetch listing"));
  }
}, { requireAuth: false }); // Listing details can be viewed without auth

export const PUT = withApi(async (
  req: NextRequest & { userId: string },
  { params }: { params: { id: string } }
) => {
  try {
    const body = await req.json() as UpdateListingInput;
    
    // Get the existing listing to check ownership
    const existingListing = await getListingAdmin(params.id);
    if (!existingListing) {
      return error(notFound("Listing not found"));
    }

    // Check if user owns this listing
    if (existingListing.sellerId !== req.userId) {
      return error(badRequest("You can only update your own listings"));
    }

    // Mark as sold (manual): only owner can set; server always sets soldThroughAllVerse false
    if (body.sold === true) {
      await markAsSoldAdmin(params.id);
      const { sold, soldAt, ...rest } = body;
      const safeRest = { ...rest } as Record<string, unknown>;
      delete safeRest.soldThroughAllVerse;
      if (Object.keys(safeRest).length > 0) {
        await updateListingAdmin(params.id, safeRest as UpdateListingInput);
      }
    } else {
      // Never allow client to set soldThroughAllVerse to true
      const safeBody = { ...body } as Record<string, unknown>;
      delete safeBody.soldThroughAllVerse;
      await updateListingAdmin(params.id, safeBody as UpdateListingInput);
    }
    
    // Price drop notification — fire-and-forget to favoriting users
    if (typeof body.price === 'number' && body.price < existingListing.price) {
      (async () => {
        try {
          const db = getAdminFirestore();
          const favSnap = await db.collection('favorites')
            .where('listingIds', 'array-contains', params.id)
            .get();
          if (favSnap.empty) return;

          const profileRefs = favSnap.docs.map(d => db.collection('profiles').doc(d.id));
          const profileDocs = await db.getAll(...profileRefs);
          const messages = profileDocs
            .filter(d => d.exists && d.id !== req.userId)
            .map(d => {
              const token = (d.data() as any)?.expoPushToken;
              if (!token?.startsWith('ExponentPushToken[')) return null;
              return {
                to: token,
                title: 'Price dropped',
                body: `"${existingListing.title}" is now $${body.price!.toLocaleString()}, down from $${existingListing.price.toLocaleString()}.`,
                data: { type: 'price_drop', listingId: params.id },
              };
            })
            .filter(Boolean) as any[];
          if (messages.length > 0) await sendPushNotifications(messages);
        } catch { /* fire-and-forget */ }
      })();
    }

    // Get the updated listing
    const updatedListing = await getListingAdmin(params.id);
    
    if (!updatedListing) {
      return error(notFound("Listing not found after update"));
    }
    
    const isSoldUpdated = (updatedListing.sold ?? false) === true || updatedListing.inventory === 0;
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
      sold: isSoldUpdated,
      soldThroughAllVerse: isSoldUpdated ? (updatedListing as any).soldThroughAllVerse === true : undefined,
    };

    return success(simpleListing);
  } catch (err) {
    console.error('Error updating listing:', err);
    return error(badRequest(`Failed to update listing: ${err instanceof Error ? err.message : 'Unknown error'}`));
  }
});

export const DELETE = withApi(async (
  req: NextRequest & { userId: string },
  { params }: { params: { id: string } }
) => {
  try {
    console.log('🗑️ Starting deletion for listing:', params.id, 'by user:', req.userId);

    // Use the comprehensive cleanup service
    const cleanupResult = await FirebaseCleanupService.deleteListingCompletely(params.id, req.userId);
    
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