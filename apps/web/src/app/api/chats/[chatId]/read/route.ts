import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getChatDocumentAdmin, markChatAsOpenedAdmin } from '@/lib/server/adminChats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = withApi(async (req: NextRequest & { userId: string }, { params }: { params: { chatId: string } }) => {
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

    await markChatAsOpenedAdmin(chatId, userId);

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    console.error('Error marking chat as read:', error);
    return NextResponse.json(
      {
        error: 'Failed to mark chat as read',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
