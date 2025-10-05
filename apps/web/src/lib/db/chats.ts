import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  limit, 
  getDocs,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Conversation } from '@/types/chat';

export async function createOrGetDraft(uid: string): Promise<Conversation> {
  // Check for existing draft
  const existing = await getDocs(
    query(
      collection(db, `users/${uid}/chats`), 
      where('isDraft', '==', true), 
      limit(1)
    )
  );
  
  if (!existing.empty) {
    const doc = existing.docs[0];
    return { 
      id: doc.id, 
      ...(doc.data() as Omit<Conversation, 'id'>)
    };
  }
  
  // Create new draft
  const ref = await addDoc(collection(db, `users/${uid}/chats`), {
    title: 'New Chat',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDraft: true,
    userId: uid,
    lastMessagePreview: ''
  });
  
  const snap = await getDoc(ref);
  return { 
    id: ref.id, 
    ...(snap.data() as Omit<Conversation, 'id'>)
  };
}

export async function promoteDraftToActive(
  uid: string, 
  chatId: string, 
  firstMessage: string
): Promise<void> {
  const { updateDoc, doc } = await import('firebase/firestore');
  
  const chatRef = doc(db, `users/${uid}/chats/${chatId}`);
  await updateDoc(chatRef, {
    isDraft: false,
    title: firstMessage.slice(0, 40),
    lastMessagePreview: firstMessage.slice(0, 100),
    updatedAt: serverTimestamp()
  });
}

export async function updateChatOnMessage(
  uid: string, 
  chatId: string, 
  message: string
): Promise<void> {
  const { updateDoc, doc } = await import('firebase/firestore');
  
  const chatRef = doc(db, `users/${uid}/chats/${chatId}`);
  await updateDoc(chatRef, {
    lastMessagePreview: message.slice(0, 100),
    updatedAt: serverTimestamp()
  });
}
