'use client';

import { useEffect, useRef } from 'react';
import { MessageCircle, Bot, ShoppingCart, Store } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { promoteDraftToActive, updateChatOnMessage } from '@/lib/db/chats';

interface ChatWindowProps {
  conversationId: string | null;
  onSendMessage: (content: string) => Promise<void>;
  userMode: 'buyer' | 'seller';
  onModeSwitch?: (mode: 'buyer' | 'seller') => void;
}

export function ChatWindow({ conversationId, onSendMessage, userMode, onModeSwitch }: ChatWindowProps) {
  const { messages, loading, error, addMessage } = useMessages(conversationId);
  const { currentUser } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!conversationId || !currentUser) return;
    
    try {
      // Check if this is the first message in a draft chat
      const isFirstMessage = messages.length === 0;
      
      if (isFirstMessage) {
        // Promote draft to active
        await promoteDraftToActive(currentUser.uid, conversationId, content);
      } else {
        // Update chat timestamp to keep it at top of stack
        await updateChatOnMessage(currentUser.uid, conversationId, content);
      }
      
      // Send the message
      await onSendMessage(content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Header with mode toggle */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <div className="h-9 w-9 rounded-xl bg-blue-600 grid place-items-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-white">AI Assistant</h1>
          <div className="ml-auto">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button
                onClick={() => onModeSwitch?.('buyer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                  userMode === 'buyer' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Buyer
              </button>
              <button
                onClick={() => onModeSwitch?.('seller')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                  userMode === 'seller' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" /> Seller
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-zinc-500">Loading messages...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-400">Error loading messages</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 px-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
            </div>
            <MessageCircle className="w-10 h-10 mb-3" />
            <p className="text-base font-medium">Start a conversation</p>
            <p className="text-sm">Your AI assistant is ready to help!</p>
            <div className="mt-4 text-xs text-zinc-400">
              Mode: {userMode === 'buyer' ? 'Buyer' : 'Seller'}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        disabled={!conversationId}
        placeholder={`Ask about ${userMode === 'buyer' ? 'products, pricing, or recommendations' : 'selling, optimization, or market insights'}...`}
      />
    </div>
  );
}
