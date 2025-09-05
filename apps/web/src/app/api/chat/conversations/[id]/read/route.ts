import { NextRequest } from 'next/server';
import { withApi } from '@/lib/withApi';
import { dbChat } from '@/lib/mockDb';
import { success, error } from '@/lib/response';
import { internal } from '@/lib/errors';

export const POST = withApi(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const conversationId = params.id;
    const userId = req.headers.get('x-user-id') || 'currentUser';

    const result = await dbChat.markAsRead(conversationId, userId);
    
    return success({
      success: true,
      messagesRead: result.messagesRead,
    });
  } catch (err) {
    return error(internal('Failed to mark conversation as read'));
  }
});
