import { NextRequest } from 'next/server';
import { withApi } from '@/lib/withApi';
import { dbChat } from '@/lib/mockDb';
import { success, error } from '@/lib/response';
import { readJson } from '@/lib/response';
import { internal, badRequest } from '@/lib/errors';

export const GET = withApi(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = params.id;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const messages = await dbChat.getMessages(conversationId, page, limit);
    
    return success({
      messages: messages.items,
      pagination: {
        page,
        limit,
        total: messages.total,
        hasMore: messages.hasMore,
      },
    });
  } catch (err) {
    return error(internal('Failed to fetch messages'));
  }
});

export const POST = withApi(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const body = await readJson<{ text: string; type?: string; offer?: any }>(req);
    const { text, type = 'text', offer } = body;
    const conversationId = params.id;

    if (!text) {
      return error(badRequest('Message text is required'));
    }

    const userId = req.headers.get('x-user-id') || 'currentUser';
    const message = await dbChat.sendMessage(conversationId, userId, text, type, offer);
    
    return success({ message });
  } catch (err) {
    return error(internal('Failed to send message'));
  }
});
