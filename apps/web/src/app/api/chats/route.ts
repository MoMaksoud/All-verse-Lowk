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

    // Enrich chats — prefer embedded participantProfiles, batch-fetch fallbacks
    const enrichedChats: any[] = [];
    const chatsNeedingFetch: { chat: typeof userChats[0]; otherUserId: string; index: number }[] = [];

    for (let i = 0; i < userChats.length; i++) {
      const chat = userChats[i];
      const otherUserId = chat.participants.find((id) => id !== userId);

      if (!otherUserId) {
        enrichedChats.push({ id: chat.id, ...chat, otherUser: null });
        continue;
      }

      const embedded = (chat as any).participantProfiles?.[otherUserId];
      if (embedded) {
        enrichedChats.push({
          id: chat.id,
          ...chat,
          unreadCount: chat.unreadCount || {},
          otherUser: {
            id: otherUserId,
            name: embedded.displayName || embedded.username || `User ${otherUserId.substring(0, 8)}`,
            username: embedded.username,
            email: embedded.email || '',
            photoURL: embedded.photoURL,
          },
        });
      } else {
        // Mark position and defer fetch
        enrichedChats.push(null); // placeholder
        chatsNeedingFetch.push({ chat, otherUserId, index: i });
      }
    }

    // Batch-fetch only the users not covered by embedded profiles (legacy chats)
    if (chatsNeedingFetch.length > 0) {
      const uniqueIds = [...new Set(chatsNeedingFetch.map(c => c.otherUserId))];
      const userMap = new Map<string, any>();
      await Promise.all(uniqueIds.map(async (id) => {
        try {
          userMap.set(id, await firestoreServices.users.getUser(id));
        } catch {
          userMap.set(id, null);
        }
      }));

      for (const { chat, otherUserId, index } of chatsNeedingFetch) {
        const otherUser = userMap.get(otherUserId);
        enrichedChats[index] = {
          id: chat.id,
          ...chat,
          unreadCount: chat.unreadCount || {},
          otherUser: {
            id: otherUserId,
            name: otherUser?.displayName || otherUser?.email || `User ${otherUserId.substring(0, 8)}`,
            username: otherUser?.username,
            email: otherUser?.email || '',
            photoURL: otherUser?.photoURL || otherUser?.profilePic || '',
          },
        };
      }
    }

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

