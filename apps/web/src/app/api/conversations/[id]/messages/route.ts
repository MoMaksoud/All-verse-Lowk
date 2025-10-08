import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { AddMessageRequest, ListMessagesResponse, Message } from '@/types/chat';
import { embeddingService } from '@/lib/embeddings';

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const pageToken = searchParams.get('pageToken');

    // Verify conversation ownership
    const conversationRef = doc(db, `users/${session.user.email}/chats`, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationSnap.data();
    if (conversationData.userId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query for messages
    let q = query(
      collection(db, `users/${session.user.email}/chats`, conversationId, 'messages'),
      orderBy('index', 'asc'),
      limit(pageSize)
    );

    // Add pagination if pageToken provided
    if (pageToken) {
      // In a real implementation, you'd decode the pageToken
      // For now, we'll skip this for simplicity
    }

    const snapshot = await getDocs(q);
    const messages: Message[] = [];
    let lastDoc: DocumentSnapshot | null = null;

    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        conversationId,
        role: data.role,
        content: data.content,
        createdAt: data.createdAt?.toDate() || new Date(),
        index: data.index,
        attachments: data.attachments || [],
        archived: data.archived || false
      });
      lastDoc = doc;
    });

    // Generate next page token (simplified)
    const nextPageToken = lastDoc ? Buffer.from(lastDoc.id).toString('base64') : undefined;
    const hasMore = messages.length === pageSize;

    const response: ListMessagesResponse = {
      messages,
      nextPageToken,
      hasMore
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/conversations/[id]/messages - Add a message to a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const body: AddMessageRequest = await request.json();
    const { role, content, attachments = [] } = body;

    // Verify conversation ownership
    const conversationRef = doc(db, `users/${session.user.email}/chats`, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationSnap.data();
    if (conversationData.userId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the next index
    const messagesQuery = query(
      collection(db, `users/${session.user.email}/chats`, conversationId, 'messages'),
      orderBy('index', 'desc'),
      limit(1)
    );
    const lastMessageSnap = await getDocs(messagesQuery);
    const nextIndex = lastMessageSnap.empty ? 0 : (lastMessageSnap.docs[0].data().index + 1);

    // Create message document
    const messageData = {
      role,
      content,
      attachments,
      createdAt: serverTimestamp(),
      index: nextIndex,
      archived: false
    };

    const messageRef = await addDoc(collection(db, `users/${session.user.email}/chats`, conversationId, 'messages'), messageData);

    // Update conversation metadata
    const lastMessagePreview = content.slice(0, 150);
    
    const updateData = {
      updatedAt: serverTimestamp(),
      lastMessagePreview
    };

    await updateDoc(conversationRef, updateData);

    // Create embedding for semantic search (if content is not too long)
    if (content.length < 1000) {
      try {
        const embedding = await embeddingService.computeEmbedding(content);
        await addDoc(collection(db, 'chat_embeddings'), {
          conversationId,
          userId: session.user.email,
          messageEmbedding: embedding,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('Failed to create embedding:', error);
      }
    }

    const response = {
      messageId: messageRef.id,
      index: nextIndex
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
}

