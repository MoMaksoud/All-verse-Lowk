'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Search, ShoppingBag } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  listing?: SimpleListing;
}

interface AIChatbotProps {
  className?: string;
}

export function AIChatbot({ className = '' }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AllVerse AI assistant. I can help you find products, answer questions about listings, and guide you through our marketplace. What can I help you with today?",
      timestamp: new Date(),
      suggestions: [
        "Show me electronics",
        "Find sports equipment",
        "What's trending?",
        "Help me sell something"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions,
        listing: data.listing
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleListingClick = (listing: SimpleListing) => {
    window.open(`/listings/${listing.id}`, '_blank');
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-accent-500 hover:bg-accent-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 group"
          >
            <Bot className="w-6 h-6" />
            <span className="hidden group-hover:block whitespace-nowrap font-medium">
              Ask AI Anything
            </span>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          </button>
        </div>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
          <div className="bg-black/50 backdrop-blur-sm absolute inset-0" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-dark-800 border border-dark-600 rounded-t-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-500 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">AllVerse AI</h3>
                  <p className="text-gray-400 text-sm">Your marketplace assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' ? 'bg-accent-500' : 'bg-gray-600'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-accent-500 text-white'
                        : 'bg-dark-700 text-gray-100'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Suggestions */}
              {messages[messages.length - 1]?.suggestions && (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Quick suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {messages[messages.length - 1].suggestions?.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="bg-dark-600 hover:bg-dark-500 text-gray-300 text-xs px-3 py-2 rounded-full transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Listing Card */}
              {messages[messages.length - 1]?.listing && (
                <div className="bg-dark-700 rounded-xl p-4 border border-dark-600">
                  <div className="flex items-center gap-3 mb-3">
                    <ShoppingBag className="w-5 h-5 text-accent-500" />
                    <span className="text-white font-medium">Found this listing:</span>
                  </div>
                  <div className="flex gap-3">
                    <img
                      src={messages[messages.length - 1].listing?.photos[0] || '/placeholder.jpg'}
                      alt={messages[messages.length - 1].listing?.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0yNCAyNEg0MFY0MEgyNFYyNFoiIGZpbGw9IiM2QjcyODAiLz4KPHN2Zz4K';
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm">
                        {messages[messages.length - 1].listing?.title}
                      </h4>
                      <p className="text-accent-400 font-semibold text-sm">
                        ${messages[messages.length - 1].listing?.price.toLocaleString()}
                      </p>
                      <button
                        onClick={() => handleListingClick(messages[messages.length - 1].listing!)}
                        className="text-accent-500 text-xs hover:text-accent-400 transition-colors mt-1"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-dark-700 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-dark-600">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                  placeholder="Ask me anything about our marketplace..."
                  className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
