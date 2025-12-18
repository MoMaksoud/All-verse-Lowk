import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { firestoreServices } from '@/lib/services/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: NextRequest & { userId: string }, { params }: { params: { chatId: string } }) => {
  try {
    const userId = req.userId;
    const { chatId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Verify user is a participant in this chat
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    if (!chatDoc.exists()) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Chat not found' },
        { status: 404 }
      );
    }

    const chat = chatDoc.data() as any;
    if (!chat.participants || !chat.participants.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this chat' },
        { status: 403 }
      );
    }

    // Fetch messages for the chat (same as web app)
    const chatMessages = await firestoreServices.chats.getChatMessages(chatId);

    // Enrich and normalize messages (ensure timestamp/chatId exist) - matching web app logic
    const enrichedMessages = await Promise.all(
      chatMessages.map(async (message) => {
        try {
          const sender = await firestoreServices.users.getUser(message.senderId);
          const normalized = {
            ...(message as any),
            chatId: (message as any).chatId ?? chatId,
            timestamp: (message as any).timestamp ?? (message as any).createdAt,
            sender: {
              id: message.senderId,
              name: sender?.displayName || sender?.email || `User ${message.senderId.substring(0, 8)}`,
              username: sender?.username,
              email: sender?.email || '',
              photoURL: sender?.photoURL,
            },
          };
          return normalized;
        } catch (error) {
          const normalized = {
            ...(message as any),
            chatId: (message as any).chatId ?? chatId,
            timestamp: (message as any).timestamp ?? (message as any).createdAt,
            sender: {
              id: message.senderId,
              name: 'Unknown User',
              email: '',
              photoURL: '',
            },
          };
          return normalized;
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedMessages,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
});

