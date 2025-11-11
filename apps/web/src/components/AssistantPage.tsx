'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Bot, ShoppingCart, Store } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string; // Changed from Date to string for JSON serialization
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer');
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { currentUser } = useAuth();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation per mode - only on mount or mode change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ai-chat-${mode}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessages([]);
    }
  }, [mode]);

  // Debounced save to localStorage - only save after messages change
  useEffect(() => {
    if (messages.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(`ai-chat-${mode}`, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [messages, mode]);

  // Auto-resize textarea
  useEffect(() => {
    if (!taRef.current) return;
    const el = taRef.current;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentUser) return;

    const userMessage = input.trim().slice(0, 2000);
    setInput('');
    setIsLoading(true);

    // Add user message immediately
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(), // Store as ISO string
    };
    
    setMessages(prev => [...prev, userMsg]);

    try {
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/ai/chat', {
        message: userMessage,
        mode,
        conversationHistory: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content
        })),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: data.response || 'No response received',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Error:', error);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, currentUser, mode, messages]);

  // Show sign-in notice if user is not authenticated
  if (!currentUser) {
    return (
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 text-lg mb-6">
            Sign up to start chatting with your AI assistant.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-zinc-950">
      <main className="flex flex-col h-full max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-1 w-fit mx-auto">
            <button
              onClick={() => setMode('buyer')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                mode === 'buyer' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" /> Buyer
            </button>
            <button
              onClick={() => setMode('seller')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                mode === 'seller' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Store className="w-4 h-4" /> Seller
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                <Bot className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm">Your AI assistant is ready to help!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-xl text-sm ${
                      msg.role === 'ai'
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl text-sm text-zinc-400">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'buyer' ? 'What are you looking for?' : 'How can I help you sell?'}
            className="flex-1 resize-none rounded-xl bg-zinc-900 text-sm px-4 py-3 outline-none border border-zinc-800 focus:border-blue-600 min-h-[48px] max-h-[120px] text-zinc-100 placeholder:text-zinc-500"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !currentUser}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </main>
    </div>
  );
}
