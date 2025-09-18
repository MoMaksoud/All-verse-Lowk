import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { firestoreServices } from '@/lib/services/firestore';
import { ListingPhotoUpload } from '@/lib/types/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('📸 Listing photos upload request received');
    
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      console.log('❌ No user ID provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const formData = await req.formData();
    const listingId = formData.get('listingId') as string;
    const files = formData.getAll('photos') as File[];
    
    console.log('📸 Upload details:', { userId, listingId, fileCount: files.length });
    
    if (!listingId) {
      console.log('❌ No listing ID provided');
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      console.log('❌ No files provided');
      return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 });
    }

    if (files.length > 10) {
      console.log('❌ Too many files:', files.length);
      return NextResponse.json({ error: 'Maximum 10 photos allowed' }, { status: 400 });
    }

    // Validate all files
    for (const file of files) {
      const validation = StorageService.validateImageFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Upload photos to Firebase Storage (or fallback to data URLs)
    console.log('📸 Starting photo upload...');
    const photoUrls = await StorageService.uploadListingImages(listingId, files);
    console.log('📸 Photos uploaded:', photoUrls.length);
    
    // Extract file paths from URLs for tracking (only for Firebase Storage URLs)
    const photoPaths = photoUrls.map(url => {
      if (url.startsWith('data:')) {
        return `data-url-${Date.now()}`;
      }
      try {
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
        return pathMatch ? decodeURIComponent(pathMatch[1]) : '';
      } catch {
        return `fallback-${Date.now()}`;
      }
    });

    // Save photo metadata to Firestore (only if Firebase is configured)
    if (isFirebaseConfigured()) {
      console.log('📸 Saving photo metadata to Firestore...');
      const photoData: ListingPhotoUpload = {
        listingId,
        userId,
        photoUrls,
        photoPaths,
        uploadedAt: new Date() as any, // Will be converted to Timestamp in service
      };

      await firestoreServices.listingPhotos.saveListingPhotos(photoData);
    } else {
      console.log('📸 Firebase not configured, skipping metadata save');
    }

    // Update listing with new photo URLs (only if listing exists)
    console.log('📸 Updating listing with photo URLs...');
    try {
      await firestoreServices.listings.updateListing(listingId, {
        images: photoUrls,
      });
      console.log('📸 Listing updated successfully');
    } catch (updateError) {
      console.log('📸 Listing update failed (listing may not exist yet):', updateError);
      // Don't fail the upload if listing doesn't exist yet
    }

    console.log('📸 Upload completed successfully');
    return NextResponse.json({
      success: true,
      photoUrls,
      photoPaths,
      message: 'Listing photos uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading listing photos:', error);
    return NextResponse.json({ error: 'Failed to upload listing photos' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get('listingId');
    
    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
    }

    // Get current listing photos
    const photoData = await firestoreServices.listingPhotos.getListingPhotos(listingId);
    
    if (photoData) {
      // Delete from Firebase Storage
      for (const photoUrl of photoData.photoUrls) {
        await StorageService.deleteProfilePicture(photoUrl); // Reuse delete function
      }
      
      // Delete from Firestore
      await firestoreServices.listingPhotos.deleteListingPhotos(listingId);
      
      // Update listing to remove photo URLs
      await firestoreServices.listings.updateListing(listingId, {
        images: [],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Listing photos deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting listing photos:', error);
    return NextResponse.json({ error: 'Failed to delete listing photos' }, { status: 500 });
  }
}
