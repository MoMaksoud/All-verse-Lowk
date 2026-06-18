'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatWithUser } from '@/hooks/useChats';
import { useAuth } from '@/contexts/AuthContext';
import { useChatContext } from '@/contexts/ChatContext';

interface ChatListProps {
  chats: ChatWithUser[];
  loading: boolean;
  error: string | null;
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins <= 1 ? 'now' : `${diffMins}m`;
  }
  if (diffHours < 24) return `${Math.floor(diffHours)}h`;
  if (diffHours < 168) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <div className="w-full h-full bg-blue-600/30 flex items-center justify-center text-blue-300 text-sm font-semibold select-none">
      {letters}
    </div>
  );
}

export function ChatList({ chats, loading, error, onChatSelect, selectedChatId }: ChatListProps) {
  const { currentUser } = useAuth();
  const { currentChatId } = useChatContext();

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
            <div className="w-11 h-11 rounded-full bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-zinc-800 rounded w-2/5" />
              <div className="h-3 bg-zinc-800 rounded w-3/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-500 px-6 text-center">
        <MessageSquare className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-sm font-medium text-zinc-400">No conversations yet</p>
        <p className="text-xs mt-1">Press the compose button to start one</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {chats.map((chat) => {
        const isSelected = selectedChatId === chat.id;
        const isViewing = currentChatId === chat.id;

        const hasUnread = (() => {
          if (!currentUser?.uid || !chat.lastMessage?.timestamp) return false;
          const lastOpenedRaw = localStorage.getItem(`lastOpenedMessagesPageAt_${currentUser.uid}`);
          const lastOpened = lastOpenedRaw ? parseInt(lastOpenedRaw, 10) : 0;
          const lastMsgMs = chat.lastMessage.timestamp.toDate
            ? chat.lastMessage.timestamp.toDate().getTime()
            : (chat.lastMessage.timestamp as any).seconds * 1000;
          const chatOpenedAt = chat.lastOpenedAt?.[currentUser.uid];
          const chatOpenedMs = chatOpenedAt
            ? (chatOpenedAt.toDate ? chatOpenedAt.toDate().getTime() : (chatOpenedAt as any).seconds * 1000)
            : 0;
          return !isViewing && lastMsgMs > Math.max(lastOpened, chatOpenedMs);
        })();

        const name = chat.otherUser?.name || 'Unknown';

        return (
          <button
            key={chat.id}
            onClick={() => onChatSelect(chat.id!)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              isSelected
                ? 'bg-zinc-800'
                : 'hover:bg-zinc-900'
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden">
                {chat.otherUser?.photoURL ? (
                  <img src={chat.otherUser.photoURL} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <Initials name={name} />
                )}
              </div>
              {hasUnread && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-zinc-950" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-white' : 'font-medium text-zinc-200'}`}>
                  {name}
                </span>
                {chat.lastMessage?.timestamp && (
                  <span className="text-xs text-zinc-500 shrink-0">
                    {formatTimestamp(chat.lastMessage.timestamp)}
                  </span>
                )}
              </div>
              {chat.lastMessage ? (
                <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
                  {chat.lastMessage.text}
                </p>
              ) : (
                <p className="text-xs text-zinc-600 mt-0.5 italic">No messages yet</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
