'use client';

import { useState, useEffect, useCallback } from 'react';
import { firestoreServices, FirestoreChat } from '@/lib/services/firestore';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatWithUser extends FirestoreChat {
  otherUser?: {
    id: string;
    name: string;
    username?: string;
    email: string;
    photoURL?: string;
  };
}

export function useChats() {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<ChatWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      setError(null);
      
      const userChats = await firestoreServices.chats.getUserChats(currentUser.uid);
      
      // Enrich chats with user data
      const enrichedChats = await Promise.all(
        userChats.map(async (chat) => {
          const otherUserId = chat.participants.find(id => id !== currentUser.uid);
          if (!otherUserId) return chat;

          try {
            const otherUser = await firestoreServices.users.getUser(otherUserId);
            return {
              ...chat,
              otherUser: {
                id: otherUserId,
                name: otherUser?.displayName || otherUser?.email || `User ${otherUserId.substring(0, 8)}`,
                username: otherUser?.username,
                email: otherUser?.email || '',
                photoURL: otherUser?.photoURL,
              },
            };
          } catch (error) {
            return {
              ...chat,
              otherUser: {
                id: otherUserId,
                name: 'Unknown User',
                email: '',
              },
            };
          }
        })
      );

      setChats(enrichedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const subscribeToChats = useCallback(() => {
    if (!currentUser?.uid) return () => {};

    return firestoreServices.chats.subscribeToUserChats(currentUser.uid, async (userChats) => {
      // Enrich chats with user data
      const enrichedChats = await Promise.all(
        userChats.map(async (chat) => {
          const otherUserId = chat.participants.find(id => id !== currentUser.uid);
          if (!otherUserId) return chat;

          try {
            // Prefer embedded participantProfiles from chat doc to avoid extra reads
            const embedded = (chat as any).participantProfiles?.[otherUserId];
            if (embedded) {
              return {
                ...chat,
                otherUser: {
                  id: otherUserId,
                  name: embedded.displayName || embedded.username || `User ${otherUserId.substring(0, 8)}`,
                  username: embedded.username,
                  email: embedded.email || '',
                  photoURL: embedded.photoURL,
                },
              };
            }

            // Fallback to users collection if not embedded (legacy chats)
            const otherUser = await firestoreServices.users.getUser(otherUserId);
            return {
              ...chat,
              otherUser: {
                id: otherUserId,
                name: otherUser?.displayName || otherUser?.email || `User ${otherUserId.substring(0, 8)}`,
                username: (otherUser as any)?.username,
                email: (otherUser as any)?.email || '',
                photoURL: (otherUser as any)?.photoURL,
              },
            };
          } catch (error) {
            console.warn('Failed to load user data for chat:', error);
            return {
              ...chat,
              otherUser: {
                id: otherUserId,
                name: 'Unknown User',
                email: '',
              },
            };
          }
        })
      );

      setChats(enrichedChats);
      setLoading(false);
    });
  }, [currentUser?.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToChats();
    return unsubscribe;
  }, [subscribeToChats]);

  const startChat = useCallback(async (otherUserId: string) => {
    if (!currentUser?.uid) throw new Error('User not authenticated');
    
    try {
      const chatId = await firestoreServices.chats.getOrCreateChat(currentUser.uid, otherUserId);
      return chatId;
    } catch (error) {
      console.error('Error starting chat:', error);
      throw error;
    }
  }, [currentUser?.uid]);

  return {
    chats,
    loading,
    error,
    startChat,
    refreshChats: loadChats,
  };
}
