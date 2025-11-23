'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { useChats } from '@/hooks/useChats';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatContext } from '@/contexts/ChatContext';
import { ChatList } from '@/components/chat/ChatList';
import { ChatView } from '@/components/chat/ChatView';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserSearchModal } from '@/components/UserSearchModal';
import { ArrowLeft, Plus } from 'lucide-react';
import { firestoreServices } from '@/lib/services/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const { chats, loading: chatsLoading, error: chatsError, startChat } = useChats();
  const { setCurrentChatId } = useChatContext();
  const { 
    messages, 
    loading: messagesLoading, 
    error: messagesError, 
    sending, 
    sendMessage 
  } = useChatMessages(selectedChatId);
  const selectedChat = chats.find(chat => chat.id === selectedChatId);
  const otherUser = selectedChat?.otherUser;

  // Update lastOpenedMessagesPageAt when Messages page is opened (clears global badge)
  useEffect(() => {
    if (!currentUser?.uid || chatsLoading) return;
    
    // Store timestamp in localStorage to track when Messages page was last opened
    // This is used to calculate global unread badge (shows if any chat has messages newer than this)
    const now = Date.now();
    localStorage.setItem(`lastOpenedMessagesPageAt_${currentUser.uid}`, now.toString());
  }, [currentUser?.uid, chatsLoading]); // Run when page loads

  // Sync currentChatId with selectedChatId
  useEffect(() => {
    setCurrentChatId(selectedChatId);
  }, [selectedChatId, setCurrentChatId]);

  // Auto-select chat from URL parameter
  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId');
    if (chatIdFromUrl && chatIdFromUrl !== selectedChatId) {
      // Set the chat from URL - messages will load even if chat isn't in list yet
      // (chat might be newly created and subscription hasn't updated)
      if (!chatsLoading) {
        setSelectedChatId(chatIdFromUrl);
        setShowMobileChat(true);
      }
    }
  }, [searchParams, chatsLoading, selectedChatId]);

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    setShowMobileChat(true);
  };
  
  const handleBack = () => {
    setShowMobileChat(false);
  };

  const handleSendMessage = async (text: string) => {
    try {
      await sendMessage(text);
      } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSelectUser = async (userId: string) => {
    if (!currentUser) {
      showError('Sign In Required', 'Please sign in to start a conversation.');
      return;
    }
    
    try {
      // Create or get existing chat
      const chatId = await firestoreServices.chats.getOrCreateChat(currentUser.uid, userId);
      
      // Navigate to the chat
      router.push(`/messages?chatId=${chatId}`);
      setSelectedChatId(chatId);
      setShowMobileChat(true);
      showSuccess('Chat Started', 'You can now start messaging!');
    } catch (error) {
      console.error('Error creating chat:', error);
      showError('Failed to Start Chat', 'Please try again later.');
    }
  };

  // Show sign-in prompt if user is not authenticated (don't wait for chats to load)
  if (!authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-300 text-lg mb-6">
              Sign up to start messaging other users.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show loading spinner while auth is loading
  if (authLoading || chatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 px-2 break-words">Messages</h1>
          <p className="text-base sm:text-lg text-zinc-400 px-4">Connect with buyers and sellers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
          {/* Chat List - Hidden on mobile when chat is open */}
          <div className={`lg:col-span-1 min-h-0 ${showMobileChat ? 'hidden lg:block' : 'block'}`}>
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 h-full flex flex-col min-h-0">
              <div className="p-4 border-b border-zinc-800 flex-shrink-0 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Conversations</h2>
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                  aria-label="New message"
                  title="New message"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <ChatList
                  chats={chats}
                  loading={chatsLoading}
                  error={chatsError}
                  onChatSelect={handleChatSelect}
                  selectedChatId={selectedChatId}
                />
              </div>
            </div>
          </div>

          {/* Chat View - Full screen on mobile when open */}
          <div className={`lg:col-span-2 min-h-0 ${showMobileChat ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 h-full flex flex-col min-h-0">
              {selectedChatId ? (
                <>
                  {/* Mobile back button */}
                  <div className="lg:hidden flex items-center gap-3 p-3 border-b border-zinc-800 bg-zinc-900/50">
                    <button
                      onClick={handleBack}
                      className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center gap-2">
                      {otherUser?.photoURL && (
                        <img src={otherUser.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      )}
                      <span className="font-medium text-white">{otherUser?.name || 'Chat'}</span>
                    </div>
                  </div>
                  <ChatView
                    chatId={selectedChatId}
                    messages={messages}
                    loading={messagesLoading}
                    error={messagesError}
                    sending={sending}
                    onSendMessage={handleSendMessage}
                    otherUser={otherUser}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-zinc-400">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}