'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { Send, Bot, ShoppingCart, Store, Trash2 } from 'lucide-react';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();

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

  const handleClearChat = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteChat = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(`ai-chat-${mode}`);
    } catch {
      // Silently fail if localStorage is unavailable
    }
    setShowDeleteConfirm(false);
  }, [mode]);

  const cancelDeleteChat = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || isLoading || !currentUser) return;

    // Ensure auth is ready and force token refresh before making API call
    if (auth) {
      await auth.authStateReady();
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        // Force refresh token to ensure it's valid
        await firebaseUser.getIdToken(true);
        // Small delay to ensure token is propagated
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const userMessage = searchQuery.trim().slice(0, 2000);
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
        const errorMessage = errorData.error || errorData.message || 'Failed to get response';
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Authentication failed. Please refresh the page and try again.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(errorMessage);
        }
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
  }, [isLoading, currentUser, mode, messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentUser) return;
    handleSearch(input.trim());
  }, [input, isLoading, currentUser, handleSearch]);

  // Read query from URL and auto-trigger search
  useEffect(() => {
    const query = searchParams.get('query');
    if (query && !hasAutoTriggered && currentUser) {
      const decodedQuery = decodeURIComponent(query);
      setInput(decodedQuery);
      setHasAutoTriggered(true);
      // Auto-trigger search after a small delay to ensure state is set
      const timeoutId = setTimeout(() => {
        handleSearch(decodedQuery);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, hasAutoTriggered, currentUser, handleSearch]);

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
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
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

        {/* Chat Box Container */}
        <div className="flex-1 flex flex-col min-h-0 mb-4 bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
          {/* Messages Area with Scrollbar */}
          <div className="flex-1 overflow-y-auto p-4 chat-scrollbar">
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
                          ? 'bg-zinc-800/80 border border-zinc-700 text-zinc-100'
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
                  <div className="bg-zinc-800/80 border border-zinc-700 px-4 py-3 rounded-xl text-sm text-zinc-400">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-zinc-800 p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'buyer' ? 'What are you looking for?' : 'How can I help you sell?'}
                className="flex-1 resize-none rounded-xl bg-zinc-900/80 text-sm px-4 py-3 outline-none border border-zinc-700 focus:border-blue-600 min-h-[48px] max-h-[120px] text-zinc-100 placeholder:text-zinc-500"
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
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelDeleteChat}>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Clear Conversation</h3>
            <p className="text-zinc-400 mb-6">Are you sure you want to clear this conversation? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteChat}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteChat}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
