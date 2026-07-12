import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getAdminStorage } from '@/lib/firebase-admin';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Handle file type - File objects from web, but React Native sends different format
    let contentType = 'image/jpeg';
    let fileName = 'photo.jpg';
    let fileSize = 0;

    // Check if it's a File object (web)
    if (file && typeof file === 'object' && 'name' in file && 'size' in file && 'type' in file) {
      // Web File object
      contentType = (file.type || 'image/jpeg').toString();
      fileName = (file.name || 'photo.jpg').toString();
      fileSize = Number(file.size || 0);
    } else {
      // React Native FormData - file might be a plain object
      const fileObj = file as any;
      if (fileObj && typeof fileObj === 'object') {
        contentType = String(fileObj?.type || fileObj?.mimeType || 'image/jpeg');
        fileName = String(fileObj?.name || fileObj?.filename || 'photo.jpg');
        fileSize = Number(fileObj?.size || 0);
      } else {
        // Fallback - assume it's an image
        contentType = 'image/jpeg';
        fileName = 'photo.jpg';
        fileSize = 0;
      }
    }

    // Ensure contentType is always a string and not undefined
    if (!contentType || typeof contentType !== 'string' || contentType === 'undefined') {
      contentType = 'image/jpeg';
    }
    
    // Ensure fileName is always a string
    if (!fileName || typeof fileName !== 'string') {
      fileName = 'photo.jpg';
    }

    // Validate file type - check contentType or infer from filename
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    
    if (!isImage && !isVideo) {
      // Try to infer from filename if contentType is missing
      const name = fileName.toLowerCase();
      if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        contentType = 'image/jpeg';
      } else if (name.match(/\.(mp4|mov|avi|webm)$/)) {
        contentType = 'video/mp4';
      } else {
        return NextResponse.json({ error: 'File must be an image or video' }, { status: 400 });
      }
    }

    // Validate file size (max 25MB)
    if (fileSize > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be smaller than 25MB' }, { status: 400 });
    }

    const userEmail = req.headers.get('x-user-email') || 'unknown@example.com';
    
    // Upload using Admin SDK (bypasses security rules)
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    let filename = `${timestamp}-${sanitizedFileName}`;
    
    // Use Admin Storage for server-side upload
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    
    // Convert File/Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(arrayBuffer);
    
    // Update fileSize from actual buffer size if it was 0
    if (fileSize === 0) {
      fileSize = buffer.length;
    }

    // Listing creation reuses AI-chat image URLs. Normalize those images here so
    // cards never receive raw multi-megabyte phone photos or HEIC files.
    if (isImage && contentType !== 'image/gif') {
      try {
        buffer = await sharp(buffer)
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
        contentType = 'image/webp';
        filename = `${timestamp}-${sanitizedFileName.replace(/\.[^.]+$/, '')}.webp`;
      } catch (error) {
        console.error('AI chat image optimization failed:', error);
        return NextResponse.json(
          { error: 'This image could not be optimized. Please upload a JPEG, PNG, or WebP image.' },
          { status: 400 }
        );
      }
    }

    const path = `ai-chat-uploads/${req.userId}/${filename}`;
    
    // Upload to Firebase Storage
    const fileRef = bucket.file(path);
    await fileRef.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          userId: req.userId,
          userEmail,
          uploadedAt: new Date().toISOString(),
          category: 'ai-chat-upload',
          originalFileName: fileName,
          originalFileSize: fileSize.toString(),
          optimizedFileSize: buffer.length.toString(),
        },
      },
    });
    
    // Make the file publicly accessible
    await fileRef.makePublic();
    
    // Get the public URL
    const url = `https://storage.googleapis.com/${bucket.name}/${path}`;
    
    return NextResponse.json({
      success: true,
      url,
      type: isImage ? 'image' : 'video',
    });
  } catch (error: any) {
    console.error('❌ AI chat upload failed:', error);
    return NextResponse.json(
      { error: `Failed to upload file: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
});
