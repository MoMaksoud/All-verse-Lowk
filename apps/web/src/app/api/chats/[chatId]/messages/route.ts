import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getChatDocumentAdmin, getChatMessagesAdmin, sendMessageAdmin } from '@/lib/server/adminChats';
import { getProfileDocumentAdmin } from '@/lib/server/adminProfiles';
import { getUserAdmin } from '@/lib/server/adminUsers';
import { getListingAdmin } from '@/lib/server/adminListings';
import { sendPushNotification } from '@/lib/server/push-notifications';

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

    const chatDoc = await getChatDocumentAdmin(chatId);
    if (!chatDoc) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Chat not found' },
        { status: 404 }
      );
    }

    if (!chatDoc.participants || !chatDoc.participants.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this chat' },
        { status: 403 }
      );
    }

    const messageId = await sendMessageAdmin(
      chatId,
      userId,
      text.trim(),
      listingId
    );

    // Fire-and-forget push notification to the recipient
    const recipientId = chatDoc.participants?.find((p: string) => p !== userId);
    if (recipientId) {
      (async () => {
        try {
          const [recipientProfile, senderProfile, listing] = await Promise.all([
            getProfileDocumentAdmin(recipientId),
            getProfileDocumentAdmin(userId),
            listingId ? getListingAdmin(listingId) : Promise.resolve(null),
          ]);

          const pushToken = (recipientProfile as any)?.expoPushToken;
          if (!pushToken) return;

          const senderName = senderProfile?.username || senderProfile?.displayName || 'Someone';
          const isOffer = text.trim().startsWith('💰 Offer:');

          let notifTitle: string;
          let notifBody: string;

          if (isOffer) {
            const amountMatch = text.match(/\$([0-9,.]+)/);
            const amount = amountMatch ? `$${amountMatch[1]}` : 'an amount';
            const listingRef = listing?.title ? ` on "${listing.title}"` : '';
            notifTitle = `💰 New offer from ${senderName}`;
            notifBody = `They offered ${amount}${listingRef}. Tap to respond.`;
          } else {
            notifTitle = senderName;
            notifBody = text.trim().substring(0, 120);
          }

          await sendPushNotification({
            to: pushToken,
            title: notifTitle,
            body: notifBody,
            data: { chatId, type: isOffer ? 'offer' : 'message', listingId },
          });
        } catch {
          // Ignore
        }
      })();
    }

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error: unknown) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      {
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
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

    const chatDoc = await getChatDocumentAdmin(chatId);
    if (!chatDoc) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Chat not found' },
        { status: 404 }
      );
    }

    if (!chatDoc.participants || !chatDoc.participants.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this chat' },
        { status: 403 }
      );
    }

    const chatMessages = await getChatMessagesAdmin(chatId);

    const enrichedMessages = await Promise.all(
      chatMessages.map(async (message) => {
        try {
          const profileData = await getProfileDocumentAdmin(message.senderId);
          const sender = await getUserAdmin(message.senderId);

          const username = (profileData?.username || sender?.username || '').trim();
          let displayName = profileData?.displayName || sender?.displayName;
          if (!displayName) {
            displayName = sender?.email || 'Unknown User';
          }
          const photoURL =
            profileData?.profilePicture || sender?.photoURL || sender?.profilePic || '';

          const m = message as unknown as Record<string, unknown>;
          return {
            ...m,
            chatId: (m.chatId as string) ?? chatId,
            timestamp: m.timestamp ?? m.createdAt,
            sender: {
              id: message.senderId,
              name: displayName,
              username: username || null,
              email: sender?.email || '',
              photoURL,
            },
          };
        } catch {
          const m = message as unknown as Record<string, unknown>;
          return {
            ...m,
            chatId: (m.chatId as string) ?? chatId,
            timestamp: m.timestamp ?? m.createdAt,
            sender: {
              id: message.senderId,
              name: 'Unknown User',
              username: undefined,
              email: '',
              photoURL: '',
            },
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedMessages,
    });
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
