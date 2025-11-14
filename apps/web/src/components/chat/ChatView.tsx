'use client';

import React, { useEffect, useRef } from 'react';
import { MessageWithUser } from '@/hooks/useChatMessages';
import { MessageInput } from '@/components/chat/MessageInput';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { User } from 'lucide-react';

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

export function ChatView({ 
  chatId, 
  messages, 
  loading, 
  error, 
  sending, 
  onSendMessage, 
  otherUser 
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header - Hidden on mobile (shown in Messages page) */}
      <div className="hidden lg:flex items-center space-x-3 p-4 border-b border-zinc-800 bg-zinc-900/50">
        {otherUser?.photoURL ? (
          <img
            src={otherUser.photoURL}
            alt={otherUser.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-400" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-medium text-white">
            {otherUser?.name || 'Unknown User'}
          </h2>
          {otherUser?.username && (
            <p className="text-sm text-zinc-400">
              @{otherUser.username}
            </p>
          )}
          <p className="text-sm text-zinc-400">
            {otherUser?.email}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <div className="text-center">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender?.id === otherUser?.id ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl text-sm ${
                  message.sender?.id === otherUser?.id
                    ? 'bg-zinc-800/80 border border-zinc-700 text-zinc-100'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender?.id === otherUser?.id
                      ? 'text-zinc-400'
                      : 'text-blue-100'
                  }`}
                >
                  {formatMessageTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={onSendMessage}
          disabled={sending}
          placeholder={`Message ${otherUser?.name || 'user'}...`}
        />
      </div>
    </div>
  );
}
