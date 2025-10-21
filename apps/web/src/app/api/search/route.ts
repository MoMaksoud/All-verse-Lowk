import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs
} from 'firebase/firestore';
import { SearchResponse, Conversation, Message } from '@/types/chat';
import { embeddingService } from '@/lib/embeddings';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/search - Search conversations and messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      // Return recent conversations if no search query
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('userId', '==', session.user.email),
        orderBy('updatedAt', 'desc'),
        limit(20)
      );

      const conversationsSnap = await getDocs(conversationsQuery);
      const conversations: Conversation[] = [];

      conversationsSnap.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastMessagePreview: data.lastMessagePreview || '',
          isDraft: data.isDraft || false,
          tokenCount: data.tokenCount || 0,
          summary: data.summary || ''
        });
      });

      return NextResponse.json({
        conversations,
        messages: [],
        totalResults: conversations.length
      });
    }

    const searchTerm = q.toLowerCase();
    const results: { conversations: Conversation[], messages: Message[] } = {
      conversations: [],
      messages: []
    };

    // Full text search in conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('userId', '==', session.user.email),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );

    const conversationsSnap = await getDocs(conversationsQuery);
    const conversationMap = new Map<string, Conversation>();

    conversationsSnap.forEach((doc) => {
      const data = doc.data();
      const conversation: Conversation = {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastMessagePreview: data.lastMessagePreview || '',
        isDraft: data.isDraft || false,
        tokenCount: data.tokenCount || 0,
        summary: data.summary || ''
      };

      // Check if search term matches title or last message preview
      if (conversation.title.toLowerCase().includes(searchTerm) || 
          conversation.lastMessagePreview.toLowerCase().includes(searchTerm)) {
        results.conversations.push(conversation);
        conversationMap.set(doc.id, conversation);
      }
    });

    // Search in messages
    for (const conversation of results.conversations) {
      const messagesQuery = query(
        collection(db, 'conversations', conversation.id, 'messages'),
        orderBy('index', 'asc')
      );

      const messagesSnap = await getDocs(messagesQuery);
      messagesSnap.forEach((doc) => {
        const data = doc.data();
        if (data.content.toLowerCase().includes(searchTerm)) {
          results.messages.push({
            id: doc.id,
            conversationId: conversation.id,
            role: data.role,
            content: data.content,
            createdAt: data.createdAt?.toDate() || new Date(),
            index: data.index,
            attachments: data.attachments || [],
            archived: data.archived || false
          });
        }
      });
    }

    // Semantic search using embeddings (if available)
    try {
      const queryEmbedding = await embeddingService.computeEmbedding(q);
      
      // Get embeddings for this user
      const embeddingsQuery = query(
        collection(db, 'chat_embeddings'),
        where('userId', '==', session.user.email),
        limit(1000)
      );

      const embeddingsSnap = await getDocs(embeddingsQuery);
      const semanticResults: { messageId: string, conversationId: string, similarity: number }[] = [];

      embeddingsSnap.forEach((doc) => {
        const data = doc.data();
        const similarity = embeddingService.computeSimilarity(queryEmbedding, data.messageEmbedding);
        
        if (similarity > 0.7) { // Threshold for relevance
          semanticResults.push({
            messageId: doc.id,
            conversationId: data.conversationId,
            similarity
          });
        }
      });

      // Sort by similarity and get top 20
      semanticResults.sort((a, b) => b.similarity - a.similarity);
      const topSemanticResults = semanticResults.slice(0, 20);

      // Fetch the actual messages for semantic results
      for (const result of topSemanticResults) {
        const conversation = conversationMap.get(result.conversationId);
        if (conversation) {
          const messagesQuery = query(
            collection(db, 'conversations', result.conversationId, 'messages'),
            where('__name__', '==', result.messageId)
          );

          const messageSnap = await getDocs(messagesQuery);
          messageSnap.forEach((doc) => {
            const data = doc.data();
            // Check if message is not already in results
            const exists = results.messages.some(msg => msg.id === doc.id);
            if (!exists) {
              results.messages.push({
                id: doc.id,
                conversationId: result.conversationId,
                role: data.role,
                content: data.content,
                createdAt: data.createdAt?.toDate() || new Date(),
                index: data.index,
                attachments: data.attachments || [],
                archived: data.archived || false
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn('Semantic search failed:', error);
      // Continue with text search only
    }

    // Sort messages by relevance (exact matches first, then by date)
    results.messages.sort((a, b) => {
      const aExact = a.content.toLowerCase().includes(searchTerm);
      const bExact = b.content.toLowerCase().includes(searchTerm);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Limit results
    results.messages = results.messages.slice(0, 50);

    const response: SearchResponse = {
      conversations: results.conversations,
      messages: results.messages,
      totalResults: results.conversations.length + results.messages.length
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
