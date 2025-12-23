import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { firestoreServices } from '@/lib/services/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const userId = req.userId;
    const body = await req.json();
    const { otherUserId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }

    if (!otherUserId || typeof otherUserId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'otherUserId is required' },
        { status: 400 }
      );
    }

    // Validate that users are different
    if (userId === otherUserId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Cannot create a chat with yourself' },
        { status: 400 }
      );
    }

    // Create or get existing chat
    const chatId = await firestoreServices.chats.getOrCreateChat(userId, otherUserId);

    return NextResponse.json({
      success: true,
      chatId,
    });
  } catch (error: any) {
    console.error('Error creating/getting chat:', error);
    
    // Handle specific error cases
    if (error?.message?.includes('deleted user')) {
      return NextResponse.json(
        {
          error: 'Cannot create chat',
          message: 'Cannot message a deleted user',
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to create chat',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }

    // Fetch user's chats (same as web app)
    const userChats = await firestoreServices.chats.getUserChats(userId);

    // Enrich chats with user data (matching web app logic exactly)
    const enrichedChats = await Promise.all(
      userChats.map(async (chat) => {
        const otherUserId = chat.participants.find((id) => id !== userId);
        
        if (!otherUserId) {
          return {
            id: chat.id,
            ...chat,
            otherUser: null,
          };
        }

        try {
          // Prefer embedded participantProfiles from chat doc to avoid extra reads (same as web app)
          const embedded = (chat as any).participantProfiles?.[otherUserId];
          if (embedded) {
            return {
              id: chat.id,
              ...chat,
              unreadCount: chat.unreadCount || {}, // Preserve unreadCount
              otherUser: {
                id: otherUserId,
                name: embedded.displayName || embedded.username || `User ${otherUserId.substring(0, 8)}`,
                username: embedded.username,
                email: embedded.email || '',
                photoURL: embedded.photoURL,
              },
            };
          }

          // Fallback to users collection if not embedded (legacy chats) - same as web app
          const otherUser = await firestoreServices.users.getUser(otherUserId);
          return {
            id: chat.id,
            ...chat,
            unreadCount: chat.unreadCount || {}, // Preserve unreadCount
            otherUser: {
              id: otherUserId,
              name: otherUser?.displayName || otherUser?.email || `User ${otherUserId.substring(0, 8)}`,
              username: (otherUser as any)?.username,
              email: (otherUser as any)?.email || '',
              photoURL: (otherUser as any)?.photoURL || (otherUser as any)?.profilePic,
            },
          };
        } catch (error) {
          console.warn('Failed to load user data for chat:', error);
          return {
            id: chat.id,
            ...chat,
            unreadCount: chat.unreadCount || {}, // Preserve unreadCount
            otherUser: {
              id: otherUserId,
              name: 'Unknown User',
              email: '',
              photoURL: '',
            },
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedChats,
    });
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch chats',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
});

