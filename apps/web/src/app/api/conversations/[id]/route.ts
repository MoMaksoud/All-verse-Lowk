import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Conversation } from '@/types/chat';

// GET /api/conversations/[id] - Get conversation metadata
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
    const docRef = doc(db, 'conversations', conversationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const data = docSnap.data();
    
    // Check if user owns this conversation
    if (data.userId !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const conversation: Conversation = {
      id: docSnap.id,
      userId: data.userId,
      title: data.title,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastMessagePreview: data.lastMessagePreview || '',
      tokenCount: data.tokenCount || 0,
      summary: data.summary || ''
    };

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}
