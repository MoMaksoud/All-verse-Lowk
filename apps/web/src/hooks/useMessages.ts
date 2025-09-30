import { useState, useEffect, useCallback } from 'react';
import { Message, ListMessagesResponse } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';

export function useMessages(conversationId: string | null) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  const fetchMessages = useCallback(async (pageToken?: string, append = false) => {
    if (!conversationId || !currentUser) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (pageToken) {
        params.append('pageToken', pageToken);
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages?${params}`, {
        headers: {
          'x-user-id': currentUser.uid
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data: ListMessagesResponse = await response.json();
      
      if (append) {
        setMessages(prev => [...prev, ...data.messages]);
      } else {
        setMessages(data.messages);
      }
      
      setHasMore(data.hasMore);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUser]);

  const loadMore = useCallback(() => {
    if (hasMore && nextPageToken && !loading) {
      fetchMessages(nextPageToken, true);
    }
  }, [hasMore, nextPageToken, loading, fetchMessages]);

  const addMessage = useCallback(async (role: 'user' | 'assistant', content: string, attachments?: string[]) => {
    if (!conversationId || !currentUser) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid
        },
        body: JSON.stringify({
          role,
          content,
          attachments
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add message');
      }

      const data = await response.json();
      
      // Add the new message to the local state
      const newMessage: Message = {
        id: data.messageId,
        conversationId,
        role,
        content,
        createdAt: new Date(),
        index: data.index,
        attachments: attachments || []
      };

      setMessages(prev => [...prev, newMessage]);
      
      // Note: The conversation's updatedAt and lastMessagePreview are automatically
      // updated by the API route, and the real-time subscription will handle
      // moving the conversation to the top of the list
      
      return newMessage;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add message');
      throw err;
    }
  }, [conversationId, currentUser]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMore(false);
    setNextPageToken(undefined);
  }, []);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    } else {
      clearMessages();
    }
  }, [conversationId, fetchMessages, clearMessages]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    addMessage,
    clearMessages
  };
}
