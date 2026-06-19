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

function Avatar({ name, photoURL, size = 'sm' }: { name: string; photoURL?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-12 h-12' : 'w-7 h-7';
  const text = size === 'md' ? 'text-sm' : 'text-[10px]';
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
    <div className={`${dim} ${text} rounded-full shrink-0 flex items-center justify-center font-semibold select-none`}
      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', color: '#e0f2fe' }}>
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

  const name = otherUser?.name || 'Unknown';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-3 w-full px-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex gap-2.5 animate-pulse ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              <div className="w-7 h-7 rounded-full shrink-0" style={{ background: '#1e293b' }} />
              <div className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-52' : 'w-40'}`} style={{ background: '#1e293b' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: '#475569' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header — desktop only */}
      <div className="hidden lg:flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ borderBottom: contextListingId ? 'none' : '1px solid rgba(255,255,255,0.07)' }}>
        <Avatar name={name} photoURL={otherUser?.photoURL} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: '#f1f5f9' }}>{name}</p>
          {otherUser?.username && (
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>@{otherUser.username}</p>
          )}
        </div>
      </div>

      {/* Listing context card + AI suggest */}
      {contextListingId && (
        <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#475569' }}>
              Item in conversation
            </p>
            <button
              onClick={handleNegotiate}
              disabled={negotiateLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50"
              style={{ background: 'rgba(59,130,246,0.10)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.20)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.10)')}
            >
              {negotiateLoading
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Thinking…</>
                : <><Sparkles className="w-3 h-3" /> AI suggest</>
              }
            </button>
          </div>
          <ListingPreviewCard listingId={contextListingId} />
        </div>
      )}

      {/* AI suggestion */}
      {negotiateSuggestion && (
        <div className="mx-4 my-2 rounded-xl p-3 shrink-0"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: '#60a5fa' }}>
              <Sparkles className="w-3 h-3" /> AI suggestion
            </p>
            <button onClick={() => setNegotiateSuggestion(null)} style={{ color: '#475569' }}
              className="hover:opacity-70 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm leading-relaxed mb-2.5" style={{ color: '#cbd5e1' }}>{negotiateSuggestion}</p>
          <button
            onClick={handleUseSuggestion}
            className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-colors"
            style={{ background: '#3b82f6' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
          >
            Use this →
          </button>
        </div>
      )}

      {negotiateError && (
        <div className="mx-4 mb-1 shrink-0">
          <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}>
            {negotiateError}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Avatar name={name} photoURL={otherUser?.photoURL} size="md" />
              <p className="text-sm font-semibold mt-3 mb-0.5" style={{ color: '#f1f5f9' }}>{name}</p>
              {otherUser?.username && (
                <p className="text-xs" style={{ color: '#475569' }}>@{otherUser.username}</p>
              )}
              <p className="text-sm mt-4 max-w-[200px]" style={{ color: '#64748b' }}>
                Start the conversation
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg, idx) => {
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

              const bubbleRadius = isMine
                ? `18px 18px ${isGroupedWithNext ? '6px' : '4px'} ${isGroupedWithPrev ? '6px' : '18px'}`
                : `18px 18px ${isGroupedWithPrev ? '6px' : '18px'} ${isGroupedWithNext ? '6px' : '4px'}`;

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 py-4">
                      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full tabular-nums"
                        style={{ color: '#475569', background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {formatDateLabel(msg.timestamp)}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isGroupedWithPrev ? 'mt-0.5' : 'mt-3'}`}>
                    {/* Avatar slot */}
                    <div className="w-7 shrink-0">
                      {!isMine && !isGroupedWithNext && (
                        <Avatar name={name} photoURL={otherUser?.photoURL} />
                      )}
                    </div>

                    <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div
                        className="px-4 py-2.5 text-sm break-words leading-relaxed"
                        style={{
                          borderRadius: bubbleRadius,
                          background: isMine ? '#3b82f6' : '#1e293b',
                          color: isMine ? '#fff' : '#e2e8f0',
                        }}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      {!isGroupedWithNext && (
                        <span className="text-[10px] mt-1 px-1 tabular-nums" style={{ color: '#334155' }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
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
