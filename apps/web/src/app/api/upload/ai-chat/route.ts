import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getAdminStorage } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'File must be an image or video' }, { status: 400 });
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be smaller than 25MB' }, { status: 400 });
    }

    const userEmail = req.headers.get('x-user-email') || 'unknown@example.com';
    
    // Upload using Admin SDK (bypasses security rules)
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = `ai-chat-uploads/${req.userId}/${filename}`;
    
    // Use Admin Storage for server-side upload
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Firebase Storage
    const fileRef = bucket.file(path);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          userId: req.userId,
          userEmail,
          uploadedAt: new Date().toISOString(),
          category: 'ai-chat-upload',
          originalFileName: file.name,
          fileSize: file.size.toString(),
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

