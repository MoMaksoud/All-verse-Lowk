'use client';

import React from 'react';
import { MessageCircle, Clock, User } from 'lucide-react';
import { ChatWithUser } from '@/hooks/useChats';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useChatContext } from '@/contexts/ChatContext';
import { firestoreServices } from '@/lib/services/firestore';

interface ChatListProps {
  chats: ChatWithUser[];
  loading: boolean;
  error: string | null;
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

export function ChatList({ chats, loading, error, onChatSelect, selectedChatId }: ChatListProps) {
  const { currentUser } = useAuth();
  const { currentChatId, setCurrentChatId } = useChatContext();
  
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
        <MessageCircle className="w-12 h-12 mb-4" />
        <p className="text-lg font-medium">No conversations yet</p>
        <p className="text-sm">Start a conversation with someone!</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {chats.map((chat) => {
        // Calculate unread based on timestamps (WhatsApp-like)
        const hasUnread = (() => {
          if (!currentUser?.uid || !chat.lastMessage?.timestamp) return false;
          
          // Get when Messages page was last opened
          const lastOpenedMessagesPageAt = localStorage.getItem(`lastOpenedMessagesPageAt_${currentUser.uid}`);
          const lastOpenedTimestamp = lastOpenedMessagesPageAt ? parseInt(lastOpenedMessagesPageAt, 10) : 0;
          
          // Convert Firestore Timestamp to milliseconds
          const lastMessageTime = chat.lastMessage.timestamp.toDate ? 
            chat.lastMessage.timestamp.toDate().getTime() : 
            (chat.lastMessage.timestamp as any).seconds * 1000;
          
          // Get when this chat was last opened
          const chatLastOpenedAt = chat.lastOpenedAt?.[currentUser.uid];
          const chatLastOpenedTime = chatLastOpenedAt ? 
            (chatLastOpenedAt.toDate ? chatLastOpenedAt.toDate().getTime() : (chatLastOpenedAt as any).seconds * 1000) : 
            0;
          
          // Chat is unread if last message is newer than when it was last opened
          return lastMessageTime > Math.max(lastOpenedTimestamp, chatLastOpenedTime);
        })();
        
        // Keep unreadCount for display (legacy support, but we use hasUnread for logic)
        const unreadCount = currentUser?.uid ? (chat.unreadCount?.[currentUser.uid] || 0) : 0;
        
        return (
          <div
            key={chat.id}
            onClick={async () => {
              // Set currentChatId when clicking a chat (marks as inside that chat)
              if (chat.id) {
                setCurrentChatId(chat.id);
                // Mark chat as opened when clicked (updates lastOpenedAt, removes badge from chat)
                if (currentUser?.uid) {
                  await firestoreServices.chats.markChatAsOpened(chat.id, currentUser.uid);
                }
              }
              onChatSelect(chat.id!);
            }}
            className={`p-4 rounded-xl cursor-pointer transition-all relative ${
              selectedChatId === chat.id
                ? 'bg-blue-600/20 border border-blue-500/30'
                : hasUnread
                ? 'bg-blue-950/40 border border-blue-500/30 hover:bg-blue-950/60'
                : 'bg-zinc-800/50 hover:bg-zinc-800/80 border border-zinc-700'
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0 relative">
                {chat.otherUser?.photoURL ? (
                  <img
                    src={chat.otherUser.photoURL}
                    alt={chat.otherUser.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                )}
                {/* Show badge only if chat is unread AND not currently viewing this chat */}
                {hasUnread && currentChatId !== chat.id && (
                  <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm truncate ${
                      hasUnread ? 'text-white font-bold' : 'text-white font-medium'
                    }`}>
                      {chat.otherUser?.name || 'Unknown User'}
                    </h3>
                    {chat.otherUser?.username && (
                      <p className="text-xs text-zinc-400 truncate">
                        @{chat.otherUser.username}
                      </p>
                    )}
                  </div>
                  {chat.lastMessage?.timestamp && (
                    <div className="flex items-center text-xs text-zinc-400 ml-2">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimestamp(chat.lastMessage.timestamp)}
                    </div>
                  )}
                </div>
                
                {chat.lastMessage ? (
                  <p className={`text-sm truncate ${
                    hasUnread ? 'text-zinc-200 font-medium' : 'text-zinc-300'
                  }`}>
                    {chat.lastMessage.text}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No messages yet</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
