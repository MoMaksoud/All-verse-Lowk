import { NextRequest, NextResponse } from 'next/server';
import StorageService from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadType = formData.get('uploadType') as string;
    const listingId = formData.get('listingId') as string;
    const conversationId = formData.get('conversationId') as string;
    const messageId = formData.get('messageId') as string;
    const customPath = formData.get('customPath') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    let result;
    
    switch (uploadType) {
      case 'profile-picture':
        result = await StorageService.uploadProfilePicture(file, userId, userEmail);
        break;
      case 'listing-photo':
        if (!listingId) {
          return NextResponse.json(
            { error: 'Listing ID is required for listing photo upload' },
            { status: 400 }
          );
        }
        const photoIndex = parseInt(formData.get('photoIndex') as string) || 0;
        result = await StorageService.uploadListingPhoto(file, userId, userEmail, listingId, photoIndex);
        break;
      case 'listing-video':
        if (!listingId) {
          return NextResponse.json(
            { error: 'Listing ID is required for listing video upload' },
            { status: 400 }
          );
        }
        const videoIndex = parseInt(formData.get('videoIndex') as string) || 0;
        result = await StorageService.uploadListingVideo(file, userId, userEmail, listingId, videoIndex);
        break;
      case 'chat-attachment':
        if (!conversationId || !messageId) {
          return NextResponse.json(
            { error: 'Conversation ID and Message ID are required for chat attachment upload' },
            { status: 400 }
          );
        }
        result = await StorageService.uploadChatAttachment(file, userId, userEmail, conversationId, messageId);
        break;
      case 'custom':
        if (!customPath) {
          return NextResponse.json(
            { error: 'Custom path is required for custom upload' },
            { status: 400 }
          );
        }
        const userMetadata = {
          userId,
          userEmail,
          uploadedAt: new Date().toISOString(),
          category: 'custom'
        };
        result = await StorageService.uploadFile(file, customPath, userMetadata);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid upload type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const { path } = await request.json();
    
    if (!path) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    await StorageService.deleteFile(path);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error.message },
      { status: 500 }
    );
  }
}