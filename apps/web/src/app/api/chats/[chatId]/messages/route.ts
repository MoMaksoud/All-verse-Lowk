import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { firestoreServices } from '@/lib/services/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }, { params }: { params: { chatId: string } }) => {
  try {
    const userId = req.userId;
    const { chatId } = params;
    const body = await req.json();
    const { text, listingId } = body;

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

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Message text is required' },
        { status: 400 }
      );
    }

    if (text.length > 2000) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Message is too long (max 2000 characters)' },
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

    // Send the message
    const messageId = await firestoreServices.chats.sendMessage(
      chatId,
      userId,
      text.trim(),
      listingId
    );

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      {
        error: 'Failed to send message',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
});

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
          // Try to get profile first (has username), fallback to users collection
          let profileData: any = null;
          try {
            const profileDoc = await getDoc(doc(db, 'profiles', message.senderId));
            if (profileDoc.exists()) {
              profileData = profileDoc.data();
            }
          } catch (profileError) {
            // Silently continue to users collection
          }

          // Get user data as fallback
          const sender = await firestoreServices.users.getUser(message.senderId);
          
          // Prefer profile data, fallback to user data
          const username = (profileData?.username || (sender as any)?.username || '').trim();
          // Use displayName from profile, or from user, or email, but never show "User {id}"
          let displayName = profileData?.displayName || sender?.displayName;
          if (!displayName) {
            // If we have email, use it, otherwise use a generic name
            displayName = sender?.email || 'Unknown User';
          }
          const photoURL = profileData?.profilePicture || sender?.photoURL || (sender as any)?.profilePic || '';
          
          const normalized = {
            ...(message as any),
            chatId: (message as any).chatId ?? chatId,
            timestamp: (message as any).timestamp ?? (message as any).createdAt,
            sender: {
              id: message.senderId,
              name: displayName,
              username: username || null, // Include null if empty so mobile can check for it
              email: sender?.email || '',
              photoURL: photoURL,
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
              username: undefined,
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

