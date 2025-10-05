import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { CreateConversationRequest, CreateConversationResponse, ListConversationsResponse, Conversation } from '@/types/chat';

// Helper function to get user ID from request
function getUserIdFromRequest(request: NextRequest): string | null {
  // For now, we'll use a simple approach - in production you should verify Firebase ID tokens
  const userId = request.headers.get('x-user-id');
  return userId;
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateConversationRequest = await request.json();
    const { title = 'New Chat' } = body;

    // Create conversation document
    const conversationData = {
      userId,
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessagePreview: '',
      isDraft: true
    };

    const docRef = await addDoc(collection(db, `users/${userId}/chats`), conversationData);

    const response: CreateConversationResponse = {
      conversationId: docRef.id
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

// GET /api/conversations - List conversations for current user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const pageToken = searchParams.get('pageToken');

    // Build query
    let q = query(
      collection(db, `users/${userId}/chats`),
      orderBy('updatedAt', 'desc'),
      limit(pageSize)
    );

    // Add pagination if pageToken provided
    if (pageToken) {
      // In a real implementation, you'd decode the pageToken to get the last document
      // For now, we'll skip this for simplicity
    }

    const snapshot = await getDocs(q);
    const conversations: Conversation[] = [];
    let lastDoc: DocumentSnapshot | null = null;

    snapshot.forEach((doc) => {
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
      lastDoc = doc;
    });

    // Generate next page token (simplified)
    const nextPageToken = lastDoc ? Buffer.from(lastDoc.id).toString('base64') : undefined;
    const hasMore = conversations.length === pageSize;

    const response: ListConversationsResponse = {
      conversations,
      nextPageToken,
      hasMore
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
