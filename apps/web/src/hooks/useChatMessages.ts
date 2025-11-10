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
  const markedAsReadRef = useRef<string | null>(null);

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

  // Mark chat as read when opened
  useEffect(() => {
    if (chatId && currentUser?.uid && chatId !== markedAsReadRef.current) {
      markedAsReadRef.current = chatId;
      const timer = setTimeout(() => {
        firestoreServices.chats.markChatAsRead(chatId, currentUser.uid).catch(console.error);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [chatId, currentUser?.uid]);

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
