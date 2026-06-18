'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MessageWithUser } from '@/hooks/useChatMessages';
import { MessageInput } from '@/components/chat/MessageInput';
import { ListingPreviewCard } from '@/components/chat/ListingPreviewCard';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Loader2, X } from 'lucide-react';

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
  const [negotiateLoading, setNegotiateLoading] = useState(false);
  const [negotiateSuggestion, setNegotiateSuggestion] = useState<string | null>(null);
  const [negotiateError, setNegotiateError] = useState<string | null>(null);
  const [suggestedText, setSuggestedText] = useState<string | undefined>(undefined);

  // First listingId mentioned in the conversation (either party).
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

  const handleNegotiate = useCallback(async () => {
    if (!contextListingId || negotiateLoading) return;
    setNegotiateLoading(true);
    setNegotiateError(null);
    setNegotiateSuggestion(null);

    try {
      const { apiPost } = await import('@/lib/api-client');
      const res = await apiPost('/api/ai/negotiate', {
        listingId: contextListingId,
        messages: messages.slice(-8).map((m) => ({
          role: m.sender?.id === currentUser?.uid ? 'mine' : 'theirs',
          text: m.text,
        })),
      });
      const data = await res.json();
      if (res.ok && data.suggestion) {
        setNegotiateSuggestion(data.suggestion);
      } else {
        setNegotiateError(data.error || 'Could not generate a suggestion.');
      }
    } catch {
      setNegotiateError('Could not reach AI. Try again.');
    } finally {
      setNegotiateLoading(false);
    }
  }, [contextListingId, messages, currentUser?.uid, negotiateLoading]);

  const handleUseSuggestion = () => {
    if (!negotiateSuggestion) return;
    setSuggestedText(negotiateSuggestion);
    setNegotiateSuggestion(null);
  };

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
          {otherUser?.username && <p className="text-xs text-zinc-500">@{otherUser.username}</p>}
        </div>
      </div>

      {/* Listing context card + AI negotiate button */}
      {contextListingId && (
        <div className="px-4 py-2 border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-zinc-500">Item in conversation</p>
            <button
              onClick={handleNegotiate}
              disabled={negotiateLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {negotiateLoading
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Thinking…</>
                : <><Sparkles className="w-3 h-3" /> Suggest message</>
              }
            </button>
          </div>
          <ListingPreviewCard listingId={contextListingId} />
        </div>
      )}

      {/* AI suggestion chip */}
      {negotiateSuggestion && (
        <div className="px-4 py-2 border-b border-zinc-800 shrink-0 bg-blue-950/20">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs text-blue-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI suggestion
            </p>
            <button onClick={() => setNegotiateSuggestion(null)} className="text-zinc-600 hover:text-zinc-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed mb-2">{negotiateSuggestion}</p>
          <button
            onClick={handleUseSuggestion}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Use this →
          </button>
        </div>
      )}

      {negotiateError && (
        <div className="px-4 py-1.5 border-b border-zinc-800 shrink-0">
          <p className="text-xs text-red-400">{negotiateError}</p>
        </div>
      )}

      {/* Messages */}
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

            const isGroupedWithPrev =
              prevMsg &&
              prevMsg.sender?.id === msg.sender?.id &&
              toMs(msg.timestamp) - toMs(prevMsg.timestamp) < 2 * 60 * 1000;

            const isGroupedWithNext =
              nextMsg &&
              nextMsg.sender?.id === msg.sender?.id &&
              toMs(nextMsg.timestamp) - toMs(msg.timestamp) < 2 * 60 * 1000;

            const showDateSeparator = !prevMsg || !isSameDay(prevMsg.timestamp, msg.timestamp);

            const rounded = isMine
              ? `rounded-2xl ${isGroupedWithPrev ? 'rounded-tr-lg' : ''} ${isGroupedWithNext ? 'rounded-br-lg' : 'rounded-br-sm'}`
              : `rounded-2xl ${isGroupedWithPrev ? 'rounded-tl-lg' : ''} ${isGroupedWithNext ? 'rounded-bl-lg' : 'rounded-bl-sm'}`;

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
                  <div className="w-7 shrink-0">
                    {!isMine && !isGroupedWithNext && (
                      <div className="w-7 h-7 rounded-full overflow-hidden">
                        {otherUser?.photoURL
                          ? <img src={otherUser.photoURL} alt={name} className="w-full h-full object-cover" />
                          : <Initials name={name} />
                        }
                      </div>
                    )}
                  </div>

                  <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`px-3.5 py-2 text-sm break-words leading-relaxed ${rounded} ${isMine ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-100'}`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    {!isGroupedWithNext && (
                      <span className="text-[10px] text-zinc-600 mt-1 px-1">{formatTime(msg.timestamp)}</span>
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
          suggestedText={suggestedText}
          onSuggestedTextConsumed={() => setSuggestedText(undefined)}
        />
      </div>
    </div>
  );
}
