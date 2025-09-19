import { NextRequest, NextResponse } from 'next/server';
import { MessagesService } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const conversations = await MessagesService.getUserConversations(userId);
    
    return NextResponse.json({
      success: true,
      data: conversations,
      total: conversations.length
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { listingId, sellerId, initialMessage } = body;

    if (!listingId || !sellerId || !initialMessage) {
      return NextResponse.json(
        { error: 'Missing required fields: listingId, sellerId, initialMessage' },
        { status: 400 }
      );
    }

    // Create conversation
    const conversation = await MessagesService.createConversation({
      listingId,
      buyerId: userId,
      sellerId,
    });

    // Send initial message
    const message = await MessagesService.sendMessage({
      conversationId: conversation.id!,
      senderId: userId,
      text: initialMessage,
      type: 'text',
      status: 'sent'
    });

    return NextResponse.json({
      success: true,
      conversation,
      message
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
