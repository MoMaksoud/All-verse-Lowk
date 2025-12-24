import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_OPENED_MESSAGES_PAGE_KEY = 'lastOpenedMessagesPageAt';

interface Chat {
  id: string;
  lastMessage?: {
    senderId: string;
    timestamp: any;
  };
  lastOpenedAt?: { [userId: string]: any };
}

export function useUnreadMessages() {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastOpenedTimestamp, setLastOpenedTimestamp] = useState<number>(0);

  // Load last opened timestamp and refresh periodically
  useEffect(() => {
    const loadLastOpenedTimestamp = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const key = `${LAST_OPENED_MESSAGES_PAGE_KEY}_${currentUser.uid}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          setLastOpenedTimestamp(parseInt(stored, 10));
        }
      } catch (error) {
        // Ignore errors
      }
    };
    
    loadLastOpenedTimestamp();
    
    // Refresh timestamp every 2 seconds to catch updates from messages page
    const interval = setInterval(() => {
      loadLastOpenedTimestamp();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentUser?.uid]);

  const checkUnreadMessages = useCallback(async () => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await apiClient.get('/api/chats', true);
      
      if (!response.ok || response.status === 404) {
        setUnreadCount(0);
        return;
      }

      const data = await response.json();
      const chats: Chat[] = data.success && data.data ? data.data : [];

      // Calculate unread count using same logic as messages screen
      let count = 0;
      for (const chat of chats) {
        if (!chat.lastMessage?.timestamp) continue;

        // Convert Firestore Timestamp to milliseconds
        let lastMessageTime = 0;
        const timestamp = chat.lastMessage.timestamp;
        
        if (timestamp) {
          if (typeof timestamp === 'object' && 'seconds' in timestamp) {
            lastMessageTime = timestamp.seconds * 1000;
          } else if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
            lastMessageTime = timestamp.toDate().getTime();
          } else if (timestamp instanceof Date) {
            lastMessageTime = timestamp.getTime();
          } else if (typeof timestamp === 'number') {
            lastMessageTime = timestamp;
          }
        }
        
        if (lastMessageTime === 0) continue;
        
        // Get when this chat was last opened
        let chatLastOpenedTime = 0;
        const chatLastOpenedAt = chat.lastOpenedAt?.[currentUser.uid];
        if (chatLastOpenedAt) {
          if (typeof chatLastOpenedAt === 'object' && 'seconds' in chatLastOpenedAt) {
            chatLastOpenedTime = chatLastOpenedAt.seconds * 1000;
          } else if (typeof chatLastOpenedAt === 'object' && 'toDate' in chatLastOpenedAt && typeof chatLastOpenedAt.toDate === 'function') {
            chatLastOpenedTime = chatLastOpenedAt.toDate().getTime();
          } else if (chatLastOpenedAt instanceof Date) {
            chatLastOpenedTime = chatLastOpenedAt.getTime();
          } else if (typeof chatLastOpenedAt === 'number') {
            chatLastOpenedTime = chatLastOpenedAt;
          }
        }
        
        // Chat is unread if last message is newer than when it was last opened
        // AND the last message is from the other user (not from me)
        const isLastMessageFromMe = chat.lastMessage?.senderId === currentUser.uid;
        const comparisonTime = Math.max(lastOpenedTimestamp, chatLastOpenedTime);
        
        // Only count if message is from other user and newer than last opened time
        if (!isLastMessageFromMe && lastMessageTime > comparisonTime) {
          count++;
        }
      }

      setUnreadCount(count);
    } catch (error) {
      // Ignore errors, don't update count
    }
  }, [currentUser, lastOpenedTimestamp]);

  useEffect(() => {
    if (currentUser) {
      checkUnreadMessages();
      
      // Poll for new messages every 5 seconds
      const interval = setInterval(() => {
        checkUnreadMessages();
      }, 5000);
      
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [currentUser, checkUnreadMessages]);

  return unreadCount;
}

