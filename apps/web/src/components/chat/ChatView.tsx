'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MessageWithUser } from '@/hooks/useChatMessages';
import { MessageInput } from '@/components/chat/MessageInput';
import { ListingPreviewCard } from '@/components/chat/ListingPreviewCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { User } from 'lucide-react';
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
  const { currentUser } = useAuth();
  const [listingIdFromMessages, setListingIdFromMessages] = useState<string | null>(null);
  const [listingLoadError, setListingLoadError] = useState(false);

  // Extract listingId from first message that has it (for seller context)
  // Only show listing card if current user is the seller (otherUser is the buyer)
  const isSeller = useMemo(() => {
    return currentUser?.uid && otherUser?.id && messages.some(msg => 
      msg.sender?.id === otherUser.id && msg.listingId
    );
  }, [currentUser?.uid, otherUser?.id, messages]);

  useEffect(() => {
    // Find first message with listingId from buyer (otherUser)
    const buyerMessageWithListing = messages.find(msg => 
      msg.sender?.id === otherUser?.id && 
      msg.listingId && 
      typeof msg.listingId === 'string' && 
      msg.listingId.trim() !== ''
    );
    
    if (buyerMessageWithListing?.listingId) {
      const listingId = buyerMessageWithListing.listingId.trim();
      if (listingId !== listingIdFromMessages) {
        setListingIdFromMessages(listingId);
        setListingLoadError(false); // Reset error when listingId changes
      }
    } else {
      setListingIdFromMessages(null);
    }
  }, [messages, otherUser?.id, listingIdFromMessages]);

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
        <div className="w-8 h-8 overflow-hidden rounded-full">
          {otherUser?.photoURL ? (
            <img
              src={otherUser.photoURL}
              alt={otherUser.name}
              className="w-full h-full object-cover"
              style={{ width: "auto", height: "auto" }}
            />
          ) : (
            <div className="w-full h-full bg-blue-600/20 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
          )}
        </div>
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

      {/* Listing Context Card - Show above conversation for seller when buyer sends message with listingId */}
      {isSeller && listingIdFromMessages && !listingLoadError && (
        <div className="px-4 pt-4 pb-2 border-b border-zinc-800">
          <div className="text-xs text-zinc-400 mb-2">Item in conversation:</div>
          <ListingPreviewCard 
            listingId={listingIdFromMessages}
            onError={() => {
              // Log error once and set flag to prevent repeated logs
              if (!listingLoadError) {
                console.warn('Failed to load listing for chat context:', listingIdFromMessages);
                setListingLoadError(true);
              }
            }}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <div className="text-center">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            return (
              <div
                key={message.id}
                className={`flex flex-col gap-2 ${message.sender?.id === otherUser?.id ? 'items-start' : 'items-end'}`}
              >
                {/* Message Bubble - send text directly without alteration */}
                <div
                  className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm break-words ${
                    message.sender?.id === otherUser?.id
                      ? 'bg-zinc-800/80 border border-zinc-700 text-zinc-100'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
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
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="shrink-0">
        <MessageInput
          onSendMessage={onSendMessage}
          disabled={sending}
          placeholder={`Message ${otherUser?.name || 'user'}...`}
        />
      </div>
    </div>
  );
}
