'use client';

import React from 'react';
import { MessageSquare, PenSquare } from 'lucide-react';
import { ChatWithUser } from '@/hooks/useChats';
import { useAuth } from '@/contexts/AuthContext';
import { useChatContext } from '@/contexts/ChatContext';

interface ChatListProps {
  chats: ChatWithUser[];
  loading: boolean;
  error: string | null;
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
  onNewMessage?: () => void;
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

function Avatar({ name, photoURL, size = 'md' }: { name: string; photoURL?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm';
  const parts = name.trim().split(/\s+/);
  const letters = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  if (photoURL) {
    return (
      <div className={`${dim} rounded-full overflow-hidden shrink-0`}>
        <img src={photoURL} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${dim} rounded-full shrink-0 flex items-center justify-center font-semibold select-none`}
      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', color: '#e0f2fe' }}>
      {letters}
    </div>
  );
}

export function ChatList({ chats, loading, error, onChatSelect, selectedChatId, onNewMessage }: ChatListProps) {
  const { currentUser } = useAuth();
  const { currentChatId } = useChatContext();

  if (loading) {
    return (
      <div className="p-3 space-y-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse rounded-xl">
            <div className="w-11 h-11 rounded-full shrink-0" style={{ background: '#1e293b' }} />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 rounded w-2/5" style={{ background: '#1e293b' }} />
              <div className="h-3 rounded w-3/5" style={{ background: '#1e293b' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)' }}>
          <MessageSquare className="w-6 h-6" style={{ color: '#3b82f6' }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>No conversations yet</p>
        <p className="text-xs mb-5" style={{ color: '#64748b' }}>
          Message a seller or buyer to start dealing
        </p>
        {onNewMessage && (
          <button
            onClick={onNewMessage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
            style={{ background: '#3b82f6' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
          >
            <PenSquare className="w-3.5 h-3.5" />
            New message
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-1.5 px-2 space-y-0.5">
      {chats.map((chat) => {
        const isSelected = selectedChatId === chat.id;
        const isViewing = currentChatId === chat.id;

        const hasUnread = (() => {
          if (!currentUser?.uid || !chat.lastMessage?.timestamp) return false;
          // Never mark as unread if the current user sent the last message
          if (chat.lastMessage.senderId === currentUser.uid) return false;
          // Use server-side unreadCount if available (most reliable)
          if (chat.unreadCount?.[currentUser.uid] > 0) return !isViewing;
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative group"
            style={{
              background: isSelected ? 'rgba(59,130,246,0.10)' : 'transparent',
              border: isSelected ? '1px solid rgba(59,130,246,0.18)' : '1px solid transparent',
            }}
            onMouseEnter={e => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Selected accent rail */}
            {isSelected && (
              <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: '#3b82f6' }} />
            )}

            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar name={name} photoURL={chat.otherUser?.photoURL} />
              {hasUnread && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: '#3b82f6', border: '2px solid #020617' }} />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}
                  style={{ color: hasUnread ? '#f1f5f9' : '#cbd5e1' }}>
                  {name}
                </span>
                {chat.lastMessage?.timestamp && (
                  <span className="text-[11px] shrink-0 tabular-nums" style={{ color: '#475569' }}>
                    {formatTimestamp(chat.lastMessage.timestamp)}
                  </span>
                )}
              </div>
              {chat.lastMessage ? (
                <p className="text-xs truncate mt-0.5"
                  style={{ color: hasUnread ? '#94a3b8' : '#475569', fontWeight: hasUnread ? 500 : 400 }}>
                  {chat.lastMessage.text}
                </p>
              ) : (
                <p className="text-xs mt-0.5 italic" style={{ color: '#334155' }}>No messages yet</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
