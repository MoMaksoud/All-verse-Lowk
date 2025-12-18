import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getAdminStorage } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Log file type for debugging
    console.log('📤 Upload file type:', typeof file, file instanceof File, file instanceof Blob);

    // Handle React Native FormData format - type might be undefined
    // Infer content type from filename or default to image/jpeg
    let contentType = 'image/jpeg';
    let fileName = 'photo.jpg';
    let fileSize = 0;

    if (file instanceof File) {
      // Web File object
      contentType = file.type || 'image/jpeg';
      fileName = file.name || 'photo.jpg';
      fileSize = file.size || 0;
    } else if (file instanceof Blob) {
      // Blob object (React Native)
      contentType = file.type || 'image/jpeg';
      fileSize = file.size || 0;
    } else {
      // React Native FormData - file might be a string (URI) or object
      // Try to get properties safely
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
    const filename = `${timestamp}-${sanitizedFileName}`;
    const path = `ai-chat-uploads/${req.userId}/${filename}`;
    
    // Use Admin Storage for server-side upload
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    
    // Convert File/Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Update fileSize from actual buffer size if it was 0
    if (fileSize === 0) {
      fileSize = buffer.length;
    }
    
    // Upload to Firebase Storage
    const fileRef = bucket.file(path);
    await fileRef.save(buffer, {
      metadata: {
        contentType: contentType,
        metadata: {
          userId: req.userId,
          userEmail,
          uploadedAt: new Date().toISOString(),
          category: 'ai-chat-upload',
          originalFileName: fileName,
          fileSize: fileSize.toString(),
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

