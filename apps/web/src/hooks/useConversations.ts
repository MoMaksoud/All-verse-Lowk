import { useState, useEffect, useCallback } from 'react';
import { Conversation, ListConversationsResponse } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

export function useConversations() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  // Real-time subscription to conversations
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setConversations([]);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, `users/${currentUser.uid}/chats`),
      orderBy('updatedAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const conversations: Conversation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          conversations.push({
            id: doc.id,
            userId: data.userId,
            title: data.title,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastMessagePreview: data.lastMessagePreview || '',
            isDraft: data.isDraft || false
          });
        });
        
        setConversations(conversations);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching conversations:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const loadMore = useCallback(() => {
    // Real-time subscription handles all updates automatically
    // This function is kept for compatibility but doesn't need to do anything
  }, []);

  const refresh = useCallback(() => {
    // Real-time subscription handles all updates automatically
    // This function is kept for compatibility but doesn't need to do anything
  }, []);

  const addConversation = useCallback((conversation: Conversation) => {
    // Optimistic UI update - add to the top of the list
    setConversations(prev => [conversation, ...prev]);
  }, []);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    // Optimistic UI update
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id ? { ...conv, ...updates } : conv
      )
    );
  }, []);

  const removeConversation = useCallback((id: string) => {
    // Optimistic UI update
    setConversations(prev => prev.filter(conv => conv.id !== id));
  }, []);

  return {
    conversations,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    addConversation,
    updateConversation,
    removeConversation
  };
}
