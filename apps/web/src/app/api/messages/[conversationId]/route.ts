import { NextRequest, NextResponse } from 'next/server';
import { MessagesService } from '@/lib/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const messages = await MessagesService.getConversationMessages(params.conversationId);
    
    return NextResponse.json({
      success: true,
      data: messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { text, type = 'text', offer } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      );
    }

    const message = await MessagesService.sendMessage({
      conversationId: params.conversationId,
      senderId: userId,
      text,
      type,
      offer,
      status: 'sent'
    });

    return NextResponse.json({
      success: true,
      message
    }, { status: 201 });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
