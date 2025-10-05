'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'offer' | 'question';
  attachments?: string[];
  createdAt: any;
  readAt?: any;
}

interface Conversation {
  id: string;
  participants: string[];
  listingId: string;
  lastMessage?: Message;
  lastMessageAt?: any;
  createdAt: any;
  updatedAt: any;
}

export function useRealTimeMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

    const messagesRef = collection(db, 'messages', conversationId, 'threads');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        
        setMessages(newMessages.reverse()); // Reverse to show oldest first
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to messages:', err);
        setError('Failed to load messages');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  return { messages, loading, error };
}

export function useRealTimeConversations(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      return;
    }

    setLoading(true);
    setError(null);

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newConversations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Conversation));
        
        setConversations(newConversations);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to conversations:', err);
        setError('Failed to load conversations');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { conversations, loading, error };
}
