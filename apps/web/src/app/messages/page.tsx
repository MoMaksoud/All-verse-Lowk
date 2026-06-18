'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { useChats } from '@/hooks/useChats';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatContext } from '@/contexts/ChatContext';
import { ChatList } from '@/components/chat/ChatList';
import { ChatView } from '@/components/chat/ChatView';
import { UserSearchModal } from '@/components/UserSearchModal';
import { ArrowLeft, MessageSquare, PenSquare, Loader2 } from 'lucide-react';
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
  const { chats, loading: chatsLoading } = useChats();
  const { setCurrentChatId } = useChatContext();
  const { messages, loading: messagesLoading, error: messagesError, sending, sendMessage } = useChatMessages(selectedChatId);
  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const otherUser = selectedChat?.otherUser;

  // Clear global unread badge when page opens.
  useEffect(() => {
    if (!currentUser?.uid || chatsLoading) return;
    localStorage.setItem(`lastOpenedMessagesPageAt_${currentUser.uid}`, Date.now().toString());
  }, [currentUser?.uid, chatsLoading]);

  useEffect(() => {
    setCurrentChatId(selectedChatId);
  }, [selectedChatId, setCurrentChatId]);

  // Auto-open chat from URL param.
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
    } catch (err) {
      showError('Could not start conversation. Please try again.');
    }
  };

  if (!authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-gray-300 mb-6">Sign in to view your messages.</p>
            <Link href="/signin?redirect=/messages" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      <Navigation />

      {/* Full-height chat layout below nav */}
      <div className="flex flex-1 min-h-0 border-t border-zinc-800">
        {/* Sidebar — hidden on mobile when chat is open */}
        <div className={`w-full lg:w-80 xl:w-96 border-r border-zinc-800 flex flex-col min-h-0 shrink-0 ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <h1 className="text-lg font-semibold text-white">Messages</h1>
            <button
              onClick={() => setShowUserSearch(true)}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              aria-label="New message"
            >
              <PenSquare className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ChatList
              chats={chats}
              loading={chatsLoading}
              error={null}
              onChatSelect={handleChatSelect}
              selectedChatId={selectedChatId ?? undefined}
            />
          </div>
        </div>

        {/* Chat pane */}
        <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${showMobileChat ? 'flex' : 'hidden lg:flex'}`}>
          {selectedChatId ? (
            <>
              {/* Mobile back button header */}
              <div className="lg:hidden flex items-center gap-3 px-3 py-2 border-b border-zinc-800 shrink-0">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-medium text-white truncate">{otherUser?.name || 'Chat'}</span>
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
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-zinc-500" />
                </div>
                <p className="text-white font-medium mb-1">Your messages</p>
                <p className="text-zinc-500 text-sm">Select a conversation or start a new one</p>
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="mt-5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  New Message
                </button>
              </div>
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    }>
      <MessagesInner />
    </Suspense>
  );
}
