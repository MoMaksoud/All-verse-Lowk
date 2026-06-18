'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { firestoreServices } from '@/lib/services/firestore';
import { FirestoreMessage } from '@/lib/types/firestore';
import { useAuth } from '@/contexts/AuthContext';

export interface MessageWithUser extends FirestoreMessage {
  sender?: {
    id: string;
    name: string;
    username?: string;
    email: string;
    photoURL?: string;
  };
}

export function useChatMessages(chatId: string | null) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Persistent sender cache — avoids re-fetching on every subscription update.
  const senderCache = useRef(new Map<string, any>());

  const enrichMessages = useCallback(async (raw: FirestoreMessage[]): Promise<MessageWithUser[]> => {
    const uncached = [...new Set(raw.map((m) => m.senderId))].filter(
      (id) => !senderCache.current.has(id)
    );

    if (uncached.length > 0) {
      await Promise.all(
        uncached.map(async (id) => {
          try {
            senderCache.current.set(id, await firestoreServices.users.getUser(id));
          } catch {
            senderCache.current.set(id, null);
          }
        })
      );
    }

    return raw.map((msg) => {
      const sender = senderCache.current.get(msg.senderId);
      return {
        ...(msg as any),
        chatId: (msg as any).chatId ?? chatId,
        timestamp: (msg as any).timestamp ?? (msg as any).createdAt,
        sender: {
          id: msg.senderId,
          name: sender?.displayName || sender?.email || `User ${msg.senderId.slice(0, 8)}`,
          username: sender?.username,
          email: sender?.email || '',
          photoURL: sender?.photoURL,
        },
      };
    });
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !currentUser?.uid) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = firestoreServices.chats.subscribeToChatMessages(
      chatId,
      async (raw) => {
        try {
          const enriched = await enrichMessages(raw);
          setMessages(enriched);
        } catch {
          setError('Failed to load messages');
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, [chatId, currentUser?.uid, enrichMessages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!chatId || !currentUser?.uid || !text.trim()) return;
    try {
      setSending(true);
      await firestoreServices.chats.sendMessage(chatId, currentUser.uid, text.trim());
    } catch (err) {
      setError('Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  }, [chatId, currentUser?.uid]);

  return { messages, loading, error, sending, sendMessage };
}
