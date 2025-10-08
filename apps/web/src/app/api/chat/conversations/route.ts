import { NextRequest } from 'next/server';
import { withApi } from '@/lib/withApi';
import { success, error } from '@/lib/response';
import { readJson } from '@/lib/response';
import { internal, badRequest } from '@/lib/errors';

export const GET = withApi(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const userId = req.headers.get('x-user-id') || 'currentUser';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Mock conversations data - replace with actual database call
    const conversations = { items: [], total: 0, hasMore: false }; // await dbChat.getConversations(userId, page, limit);
    
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
    // Mock conversation creation - replace with actual database call
    const conversation = { id: 'mock-conversation', listingId, userId }; // await dbChat.createConversation(userId, listingId, message);
    
    return success({ conversation });
  } catch (err) {
    return error(internal('Failed to create conversation'));
  }
});
