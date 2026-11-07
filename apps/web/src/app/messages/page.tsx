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
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Messages</h1>
        <p className="mt-2 text-zinc-600">Talk to buyers and sellers about a listing. Sign in to see your conversations.</p>
        <Link href="/signin?redirect=/messages" className="btn btn-primary mt-8 self-start">
          Sign in
        </Link>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex h-[calc(100dvh-56px)] items-center justify-center" aria-busy="true" aria-label="Loading messages">
        <Loader2 strokeWidth={1.75} className="h-5 w-5 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col overflow-hidden bg-white">
      <div className="flex min-h-0 flex-1 overflow-hidden border-t border-zinc-200">
        {/* Sidebar */}
        <aside
          className={`min-h-0 w-full shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex lg:w-[300px] xl:w-[340px] ${
            showMobileChat ? 'hidden' : 'flex'
          }`}
        >
          <div className="shrink-0 px-4 pb-3 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950">Messages</h1>
              <button
                type="button"
                onClick={() => setShowUserSearch(true)}
                aria-label="New message"
                className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
              >
                <PenSquare strokeWidth={1.75} className="h-4 w-4" />
              </button>
            </div>

            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <Search strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations"
                className="input pl-9"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChatList
              chats={filteredChats}
              loading={chatsLoading}
              error={null}
              onChatSelect={handleChatSelect}
              selectedChatId={selectedChatId ?? undefined}
              onNewMessage={() => setShowUserSearch(true)}
            />
          </div>
        </aside>

        {/* Chat pane */}
        <section className={`min-h-0 min-w-0 flex-1 flex-col bg-white ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
          {selectedChatId ? (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-4 py-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setShowMobileChat(false)}
                  aria-label="Back to conversations"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-700"
                >
                  <ArrowLeft strokeWidth={1.75} className="h-4 w-4" />
                </button>
                <span className="truncate text-sm font-medium text-zinc-950">{otherUser?.name || 'Conversation'}</span>
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
            <div className="flex flex-1 flex-col items-start justify-center px-8 py-12">
              <MessageSquare strokeWidth={1.5} className="h-8 w-8 text-zinc-500" />
              <h2 className="mt-4 font-semibold text-zinc-950">
                {chats.length > 0 ? 'Pick a conversation' : 'No conversations yet'}
              </h2>
              <p className="mt-1 max-w-[44ch] text-sm text-zinc-600">
                {chats.length > 0
                  ? 'Choose one from the list to pick up where you left off.'
                  : 'Start one from a listing, or message someone directly.'}
              </p>
              <button type="button" onClick={() => setShowUserSearch(true)} className="btn btn-outline mt-6">
                <PenSquare strokeWidth={1.75} className="h-4 w-4" />
                New message
              </button>
            </div>
          )}
        </section>
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
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-56px)] items-center justify-center">
          <Loader2 strokeWidth={1.75} className="h-5 w-5 animate-spin text-primary-600" />
        </div>
      }
    >
      <MessagesInner />
    </Suspense>
  );
}
