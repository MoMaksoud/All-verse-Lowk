'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MessageWithUser } from '@/hooks/useChatMessages';
import { MessageInput } from '@/components/chat/MessageInput';
import { ListingPreviewCard } from '@/components/chat/ListingPreviewCard';
import { useAuth } from '@/contexts/AuthContext';

interface ChatViewProps {
  chatId: string;
  messages: MessageWithUser[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  onSendMessage: (text: string) => Promise<void>;
  otherUser?: {
    id: string;
    name: string;
    username?: string;
    email: string;
    photoURL?: string;
  };
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <div className="w-full h-full bg-blue-600/30 flex items-center justify-center text-blue-300 text-xs font-semibold select-none">
      {letters}
    </div>
  );
}

function toMs(timestamp: any): number {
  if (!timestamp) return 0;
  if (timestamp.toDate) return timestamp.toDate().getTime();
  if (typeof timestamp === 'number') return timestamp;
  return new Date(timestamp).getTime();
}

function formatTime(timestamp: any): string {
  const ms = toMs(timestamp);
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(timestamp: any): string {
  const ms = toMs(timestamp);
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDay.getTime() === today.getTime()) return 'Today';
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday';
  if (now.getTime() - ms < 7 * 86400000) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: any, b: any): boolean {
  const da = new Date(toMs(a));
  const db = new Date(toMs(b));
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function ChatView({ chatId, messages, loading, error, sending, onSendMessage, otherUser }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  // Find the first listingId mentioned in the chat (either party).
  const contextListingId = useMemo(() => {
    for (const msg of messages) {
      if (msg.listingId && typeof msg.listingId === 'string' && msg.listingId.trim()) {
        return msg.listingId.trim();
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-3 w-full px-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex gap-2 animate-pulse ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              <div className="w-7 h-7 rounded-full bg-zinc-800 shrink-0" />
              <div className={`h-9 rounded-2xl bg-zinc-800 ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  const name = otherUser?.name || 'Unknown';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
          {otherUser?.photoURL ? (
            <img src={otherUser.photoURL} alt={name} className="w-full h-full object-cover" />
          ) : (
            <Initials name={name} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">{name}</p>
          {otherUser?.username && (
            <p className="text-xs text-zinc-500">@{otherUser.username}</p>
          )}
        </div>
      </div>

      {/* Listing context card — visible to both parties */}
      {contextListingId && (
        <div className="px-4 py-2 border-b border-zinc-800 shrink-0">
          <p className="text-xs text-zinc-500 mb-1.5">Item in conversation</p>
          <ListingPreviewCard listingId={contextListingId} />
        </div>
      )}

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-3">
                {otherUser?.photoURL ? (
                  <img src={otherUser.photoURL} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <Initials name={name} />
                )}
              </div>
              <p className="text-white font-medium text-sm">{name}</p>
              {otherUser?.username && <p className="text-zinc-500 text-xs">@{otherUser.username}</p>}
              <p className="text-zinc-500 text-sm mt-3">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender?.id === currentUser?.uid;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

            // Group logic: same sender + within 2 minutes of prev
            const isGroupedWithPrev =
              prevMsg &&
              prevMsg.sender?.id === msg.sender?.id &&
              toMs(msg.timestamp) - toMs(prevMsg.timestamp) < 2 * 60 * 1000;

            const isGroupedWithNext =
              nextMsg &&
              nextMsg.sender?.id === msg.sender?.id &&
              toMs(nextMsg.timestamp) - toMs(msg.timestamp) < 2 * 60 * 1000;

            // Date separator
            const showDateSeparator = !prevMsg || !isSameDay(prevMsg.timestamp, msg.timestamp);

            // Bubble shape
            const rounded = isMine
              ? `rounded-2xl rounded-br-sm ${isGroupedWithPrev ? 'rounded-tr-lg' : ''} ${isGroupedWithNext ? 'rounded-br-lg' : 'rounded-br-sm'}`
              : `rounded-2xl rounded-bl-sm ${isGroupedWithPrev ? 'rounded-tl-lg' : ''} ${isGroupedWithNext ? 'rounded-bl-lg' : 'rounded-bl-sm'}`;

            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-xs text-zinc-500 shrink-0">{formatDateLabel(msg.timestamp)}</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                )}

                <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isGroupedWithPrev ? 'mt-0.5' : 'mt-3'}`}>
                  {/* Avatar — only shown for last message in a group from other person */}
                  <div className="w-7 shrink-0">
                    {!isMine && !isGroupedWithNext && (
                      <div className="w-7 h-7 rounded-full overflow-hidden">
                        {otherUser?.photoURL ? (
                          <img src={otherUser.photoURL} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <Initials name={name} />
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-3.5 py-2 text-sm break-words leading-relaxed ${rounded} ${
                        isMine
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* Timestamp — only on last message of a group */}
                    {!isGroupedWithNext && (
                      <span className="text-[10px] text-zinc-600 mt-1 px-1">
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <MessageInput
          onSendMessage={onSendMessage}
          disabled={sending}
          placeholder={`Message ${name}…`}
        />
      </div>
    </div>
  );
}
