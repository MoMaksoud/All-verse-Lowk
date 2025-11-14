'use client';

import React from 'react';
import { MessageCircle, Clock, User } from 'lucide-react';
import { ChatWithUser } from '@/hooks/useChats';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface ChatListProps {
  chats: ChatWithUser[];
  loading: boolean;
  error: string | null;
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

export function ChatList({ chats, loading, error, onChatSelect, selectedChatId }: ChatListProps) {
  const { currentUser } = useAuth();
  
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
        const unreadCount = currentUser?.uid ? (chat.unreadCount?.[currentUser.uid] || 0) : 0;
        const hasUnread = unreadCount > 0;
        
        return (
          <div
            key={chat.id}
            onClick={() => onChatSelect(chat.id!)}
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
                {hasUnread && (
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
