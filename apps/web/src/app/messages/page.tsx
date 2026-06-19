'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChats } from '@/hooks/useChats';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatContext } from '@/contexts/ChatContext';
import { ChatList } from '@/components/chat/ChatList';
import { ChatView } from '@/components/chat/ChatView';
import { UserSearchModal } from '@/components/UserSearchModal';
import { ArrowLeft, MessageSquare, PenSquare, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import { firestoreServices } from '@/lib/services/firestore';

function MessagesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { chats, loading: chatsLoading } = useChats();
  const { setCurrentChatId } = useChatContext();
  const { messages, loading: messagesLoading, error: messagesError, sending, sendMessage } = useChatMessages(selectedChatId);
  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const otherUser = selectedChat?.otherUser;

  const filteredChats = searchQuery.trim()
    ? chats.filter((c) => c.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  useEffect(() => {
    if (!currentUser?.uid || chatsLoading) return;
    localStorage.setItem(`lastOpenedMessagesPageAt_${currentUser.uid}`, Date.now().toString());
  }, [currentUser?.uid, chatsLoading]);

  useEffect(() => {
    setCurrentChatId(selectedChatId);
  }, [selectedChatId, setCurrentChatId]);

  useEffect(() => {
    const id = searchParams.get('chatId');
    if (id && id !== selectedChatId && !chatsLoading) {
      setSelectedChatId(id);
      setShowMobileChat(true);
    }
  }, [searchParams, chatsLoading, selectedChatId]);

  const handleChatSelect = async (chatId: string) => {
    setSelectedChatId(chatId);
    setShowMobileChat(true);
    setCurrentChatId(chatId);
    if (currentUser?.uid) {
      await firestoreServices.chats.markChatAsOpened(chatId, currentUser.uid).catch(() => {});
    }
  };

  const handleSelectUser = async (userId: string) => {
    if (!currentUser) { showError('Sign in to start a conversation.'); return; }
    try {
      const { apiPost } = await import('@/lib/api-client');
      const res = await apiPost('/api/chats', { otherUserId: userId });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.chatId) throw new Error(payload?.message || 'Failed to start chat');
      router.push(`/messages?chatId=${payload.chatId}`);
      setSelectedChatId(payload.chatId);
      setShowMobileChat(true);
    } catch {
      showError('Could not start conversation. Please try again.');
    }
  };

  if (!authLoading && !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ background: '#020617', height: 'calc(100dvh - 56px)' }}>
        <div className="text-center px-6 max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#f1f5f9' }}>Sign in to see messages</h1>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>
            Talk directly with buyers and sellers on AllVerse.
          </p>
          <Link
            href="/signin?redirect=/messages"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#3b82f6' }}
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ background: '#020617', height: 'calc(100dvh - 56px)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: '#020617', height: 'calc(100dvh - 56px)' }}>

      <div className="flex min-h-0" style={{ flex: '1 1 0', borderTop: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <div
          className={`w-full lg:w-[300px] xl:w-[340px] flex flex-col min-h-0 shrink-0 ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}
          style={{ borderRight: '1px solid rgba(255,255,255,0.07)', background: '#020617' }}
        >
          {/* Sidebar header */}
          <div className="px-4 pt-5 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-base font-bold" style={{ color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                Messages
              </h1>
              <button
                onClick={() => setShowUserSearch(true)}
                aria-label="New message"
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#1e293b';
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                }}
              >
                <PenSquare className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#475569' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full text-sm pl-9 pr-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f1f5f9',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
            <ChatList
              chats={filteredChats}
              loading={chatsLoading}
              error={null}
              onChatSelect={handleChatSelect}
              selectedChatId={selectedChatId ?? undefined}
              onNewMessage={() => setShowUserSearch(true)}
            />
          </div>
        </div>

        {/* ── Chat pane ── */}
        <div
          className={`flex-1 flex flex-col min-h-0 min-w-0 ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}
          style={{ background: '#020617' }}
        >
          {selectedChatId ? (
            <>
              {/* Mobile back button */}
              <div
                className="lg:hidden flex items-center gap-3 px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
              >
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: '#1e293b', color: '#94a3b8' }}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-sm truncate" style={{ color: '#f1f5f9' }}>
                  {otherUser?.name || 'Chat'}
                </span>
              </div>
              <ChatView
                chatId={selectedChatId}
                messages={messages}
                loading={messagesLoading}
                error={messagesError}
                sending={sending}
                onSendMessage={sendMessage}
                otherUser={otherUser}
              />
            </>
          ) : (
            /* Empty state — no chat selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(29,78,216,0.2) 0%, rgba(59,130,246,0.2) 100%)',
                  border: '1px solid rgba(59,130,246,0.20)',
                }}
              >
                <MessageSquare className="w-9 h-9" style={{ color: '#3b82f6' }} />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: '#f1f5f9' }}>
                Your conversations
              </h2>
              <p className="text-sm max-w-[260px] mb-8 leading-relaxed" style={{ color: '#64748b' }}>
                Message sellers about listings, negotiate prices, and close deals.
              </p>
              <button
                onClick={() => setShowUserSearch(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: '#3b82f6' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
              >
                <PenSquare className="w-4 h-4" />
                New Message
              </button>

              {chats.length > 0 && (
                <p className="text-xs mt-6" style={{ color: '#334155' }}>
                  ← Select a conversation from the sidebar
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center" style={{ background: '#020617', height: 'calc(100dvh - 56px)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#3b82f6' }} />
      </div>
    }>
      <MessagesInner />
    </Suspense>
  );
}
