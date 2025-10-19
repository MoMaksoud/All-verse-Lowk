'use client';

import { useState, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import { firestoreServices, FirestoreChatMessage } from '@/lib/services/firestore';
=======
import { firestoreServices } from '@/lib/services/firestore';
import { FirestoreMessage } from '@/lib/types/firestore';  
>>>>>>> 983c5098455f610a11d5a4733237edb0d9d95047
import { useAuth } from '@/contexts/AuthContext';

export interface MessageWithUser extends FirestoreChatMessage {
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

  const loadMessages = useCallback(async () => {
    if (!chatId || !currentUser?.uid) return;

    try {
      setLoading(true);
      setError(null);
      
      const chatMessages = await firestoreServices.chats.getChatMessages(chatId);

      // Enrich and normalize messages (ensure timestamp/chatId exist)
      const enrichedMessages = await Promise.all(
        chatMessages.map(async (message) => {
          try {
            const sender = await firestoreServices.users.getUser(message.senderId);
            const normalized: MessageWithUser = {
              ...(message as any),
              chatId: (message as any).chatId ?? chatId!,
              timestamp: (message as any).timestamp ?? (message as any).createdAt,
              sender: {
                id: message.senderId,
                name: sender?.displayName || sender?.email || `User ${message.senderId.substring(0, 8)}`,
                username: sender?.username,
                email: sender?.email || '',
                photoURL: sender?.photoURL,
              },
            };
            return normalized;
          } catch (error) {
            const normalized: MessageWithUser = {
              ...(message as any),
              chatId: (message as any).chatId ?? chatId!,
              timestamp: (message as any).timestamp ?? (message as any).createdAt,
              sender: {
                id: message.senderId,
                name: 'Unknown User',
                email: '',
              },
            } as MessageWithUser;
            return normalized;
          }
        })
      );

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [chatId, currentUser?.uid]);

  const subscribeToMessages = useCallback(() => {
    if (!chatId || !currentUser?.uid) return () => {};

    return firestoreServices.chats.subscribeToChatMessages(chatId, async (chatMessages) => {
      // Enrich and normalize messages (ensure timestamp/chatId exist)
      const enrichedMessages = await Promise.all(
        chatMessages.map(async (message) => {
          try {
            const sender = await firestoreServices.users.getUser(message.senderId);
            const normalized: MessageWithUser = {
              ...(message as any),
              chatId: (message as any).chatId ?? chatId!,
              timestamp: (message as any).timestamp ?? (message as any).createdAt,
              sender: {
                id: message.senderId,
                name: sender?.displayName || sender?.email || `User ${message.senderId.substring(0, 8)}`,
                username: (sender as any)?.username,
                email: (sender as any)?.email || '',
                photoURL: (sender as any)?.photoURL,
              },
            };
            return normalized;
          } catch (error) {
            const normalized: MessageWithUser = {
              ...(message as any),
              chatId: (message as any).chatId ?? chatId!,
              timestamp: (message as any).timestamp ?? (message as any).createdAt,
              sender: {
                id: message.senderId,
                name: `User ${message.senderId.substring(0, 8)}`,
                email: '',
              },
            } as MessageWithUser;
            return normalized;
          }
        })
      );

      setMessages(enrichedMessages);
      setLoading(false);
    });
  }, [chatId, currentUser?.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages();
    return unsubscribe;
  }, [subscribeToMessages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!chatId || !currentUser?.uid || !text.trim()) return;

    try {
      setSending(true);
      setError(null);
      
      await firestoreServices.chats.sendMessage(chatId, currentUser.uid, text.trim());
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      throw error;
    } finally {
      setSending(false);
    }
  }, [chatId, currentUser?.uid]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    refreshMessages: loadMessages,
  };
}
