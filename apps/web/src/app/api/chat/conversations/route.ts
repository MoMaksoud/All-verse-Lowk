import { NextRequest } from 'next/server';
import { withApi } from '@/lib/withApi';
import { dbChat } from '@/lib/mockDb';
import { success, error } from '@/lib/response';
import { readJson } from '@/lib/response';
import { internal, badRequest } from '@/lib/errors';

export const GET = withApi(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const userId = req.headers.get('x-user-id') || 'currentUser';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const conversations = await dbChat.getConversations(userId, page, limit);
    
    return success({
      conversations: conversations.items,
      pagination: {
        page,
        limit,
        total: conversations.total,
        hasMore: conversations.hasMore,
      },
    });
  } catch (err) {
    return error(internal('Failed to fetch conversations'));
  }
});

export const POST = withApi(async (req: NextRequest) => {
  try {
    const body = await readJson<{ listingId: string; message: string }>(req);
    const { listingId, message } = body;

    if (!listingId || !message) {
      return error(badRequest('Missing required fields: listingId, message'));
    }

    const userId = req.headers.get('x-user-id') || 'currentUser';
    const conversation = await dbChat.createConversation(userId, listingId, message);
    
    return success({ conversation });
  } catch (err) {
    return error(internal('Failed to create conversation'));
  }
});
