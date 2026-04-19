import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { FirestoreChat, FirestoreMessage } from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import { getProfileDocumentAdmin } from '@/lib/server/adminProfiles';

const CHATS = COLLECTIONS.CHATS;

export async function getChatDocumentAdmin(
  chatId: string
): Promise<(FirestoreChat & { id: string }) | null> {
  const snap = await getAdminFirestore().collection(CHATS).doc(chatId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as FirestoreChat) };
}

export async function getOrCreateChatAdmin(userId1: string, userId2: string): Promise<string> {
  const db = getAdminFirestore();

  const user1Snap = await db.collection(COLLECTIONS.USERS).doc(userId1).get();
  const user2Snap = await db.collection(COLLECTIONS.USERS).doc(userId2).get();
  const user1Deleted = user1Snap.exists && (user1Snap.data() as { deleted?: boolean })?.deleted === true;
  const user2Deleted = user2Snap.exists && (user2Snap.data() as { deleted?: boolean })?.deleted === true;
  if (user1Deleted || user2Deleted) {
    throw new Error('Cannot create chat with a deleted user');
  }

  const participants = [userId1, userId2].sort();
  const chatId = participants.join('_');
  const chatRef = db.collection(CHATS).doc(chatId);
  const chatSnap = await chatRef.get();

  if (chatSnap.exists) {
    const chatData = chatSnap.data() as { deletedParticipants?: Record<string, boolean> };
    if (chatData?.deletedParticipants?.[userId1] || chatData?.deletedParticipants?.[userId2]) {
      throw new Error('Cannot message a deleted user');
    }
  }

  if (!chatSnap.exists) {
    const buildProfile = async (uid: string) => {
      try {
        const p = await getProfileDocumentAdmin(uid);
        const displayName = p?.displayName || p?.username || `User ${uid.substring(0, 8)}`;
        const username = p?.username || displayName;
        const photoURL = p?.profilePicture || '';
        return {
          displayName: displayName || `User ${uid.substring(0, 8)}`,
          username: username || displayName || `User ${uid.substring(0, 8)}`,
          photoURL: photoURL || '',
        };
      } catch {
        return {
          displayName: `User ${uid.substring(0, 8)}`,
          username: `User ${uid.substring(0, 8)}`,
          photoURL: '',
        };
      }
    };

    const [p1, p2] = await Promise.all([buildProfile(userId1), buildProfile(userId2)]);

    const newChat: Record<string, unknown> = {
      participants,
      participantProfiles: {
        [userId1]: {
          displayName: p1.displayName,
          username: p1.username,
          photoURL: p1.photoURL,
        },
        [userId2]: {
          displayName: p2.displayName,
          username: p2.username,
          photoURL: p2.photoURL,
        },
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await chatRef.set(newChat);
  }

  return chatId;
}

export async function getUserChatsAdmin(userId: string): Promise<(FirestoreChat & { id: string })[]> {
  const snap = await getAdminFirestore()
    .collection(CHATS)
    .where('participants', 'array-contains', userId)
    .orderBy('updatedAt', 'desc')
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirestoreChat) }));
}

export async function sendMessageAdmin(
  chatId: string,
  senderId: string,
  text: string,
  listingId?: string
): Promise<string> {
  const db = getAdminFirestore();
  const chatRef = db.collection(CHATS).doc(chatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) {
    throw new Error('Chat not found');
  }

  const chat = chatSnap.data() as {
    participants?: string[];
    deletedParticipants?: Record<string, boolean>;
  };
  const participants = chat.participants || [];
  const deletedParticipants = chat.deletedParticipants || {};
  const otherParticipant = participants.find((p) => p !== senderId);
  if (otherParticipant && deletedParticipants[otherParticipant]) {
    throw new Error('Cannot send message to a deleted user');
  }

  const validListingId =
    listingId && typeof listingId === 'string' && listingId.trim() !== '' ? listingId.trim() : undefined;

  const messageData: Record<string, unknown> = {
    chatId,
    senderId,
    text,
    timestamp: FieldValue.serverTimestamp(),
    readBy: [senderId],
  };
  if (validListingId) messageData.listingId = validListingId;

  const msgCol = chatRef.collection('messages');
  const msgRef = await msgCol.add(messageData);

  const updates: Record<string, unknown> = {
    lastMessage: {
      text,
      senderId,
      timestamp: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const uid of participants) {
    if (uid !== senderId) {
      updates[`unreadCount.${uid}`] = FieldValue.increment(1);
    }
  }

  await chatRef.update(updates);
  return msgRef.id;
}

export async function getChatMessagesAdmin(chatId: string): Promise<FirestoreMessage[]> {
  const snap = await getAdminFirestore()
    .collection(CHATS)
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FirestoreMessage[];
}

export async function markChatAsOpenedAdmin(chatId: string, userId: string): Promise<void> {
  const chatRef = getAdminFirestore().collection(CHATS).doc(chatId);
  await chatRef.update({
    [`lastOpenedAt.${userId}`]: FieldValue.serverTimestamp(),
    [`unreadCount.${userId}`]: 0,
  });
}
