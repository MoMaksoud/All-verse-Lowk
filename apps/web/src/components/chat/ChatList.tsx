'use client';

import React from 'react';
import { MessageCircle, Clock, User } from 'lucide-react';
import { ChatWithUser } from '@/hooks/useChats';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ChatListProps {
  chats: ChatWithUser[];
  loading: boolean;
  error: string | null;
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

export function ChatList({ chats, loading, error, onChatSelect, selectedChatId }: ChatListProps) {
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
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <MessageCircle className="w-12 h-12 mb-4" />
        <p className="text-lg font-medium">No conversations yet</p>
        <p className="text-sm">Start a conversation with someone!</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onChatSelect(chat.id!)}
          className={`p-4 rounded-lg cursor-pointer transition-colors ${
            selectedChatId === chat.id
              ? 'bg-accent-500/20 border border-accent-500/30'
              : 'bg-dark-surface hover:bg-dark-surface/80 border border-dark-border'
          }`}
        >
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {chat.otherUser?.photoURL ? (
                <img
                  src={chat.otherUser.photoURL}
                  alt={chat.otherUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent-400" />
                </div>
              )}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">
                    {chat.otherUser?.name || 'Unknown User'}
                  </h3>
                  {chat.otherUser?.username && (
                    <p className="text-xs text-gray-400 truncate">
                      @{chat.otherUser.username}
                    </p>
                  )}
                </div>
                {chat.lastMessage?.timestamp && (
                  <div className="flex items-center text-xs text-gray-400 ml-2">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTimestamp(chat.lastMessage.timestamp)}
                  </div>
                )}
              </div>
              
              {chat.lastMessage ? (
                <p className="text-sm text-gray-300 truncate">
                  {chat.lastMessage.text}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">No messages yet</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
