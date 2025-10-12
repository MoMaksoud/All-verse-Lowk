'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { useChats } from '@/hooks/useChats';
import { useChatMessages } from '@/hooks/useChatMessages';
import dynamic from 'next/dynamic';
const ChatList = dynamic(() => import('@/components/chat/ChatList'));
const ChatView = dynamic(() => import('@/components/chat/ChatView'));
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function MessagesPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { chats, loading: chatsLoading, error: chatsError, startChat } = useChats();
  const { 
    messages, 
    loading: messagesLoading, 
    error: messagesError, 
    sending, 
    sendMessage 
  } = useChatMessages(selectedChatId);

  const selectedChat = chats.find(chat => chat.id === selectedChatId);
  const otherUser = selectedChat?.otherUser;

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleSendMessage = async (text: string) => {
    try {
      await sendMessage(text);
      } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (chatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">Messages</h1>
          <p className="text-lg text-gray-400">Connect with buyers and sellers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
          {/* Chat List */}
          <div className="lg:col-span-1 min-h-0">
            <div className="bg-dark-surface rounded-lg border border-dark-border h-full flex flex-col min-h-0">
              <div className="p-4 border-b border-dark-border flex-shrink-0">
                  <h2 className="text-lg font-semibold text-white">Conversations</h2>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
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

          {/* Chat View */}
          <div className="lg:col-span-2 min-h-0">
            <div className="bg-dark-surface rounded-lg border border-dark-border h-full flex flex-col min-h-0">
              {selectedChatId ? (
                <ChatView
                  chatId={selectedChatId}
                  messages={messages}
                  loading={messagesLoading}
                  error={messagesError}
                  sending={sending}
                  onSendMessage={handleSendMessage}
                  otherUser={otherUser}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-gray-400">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}