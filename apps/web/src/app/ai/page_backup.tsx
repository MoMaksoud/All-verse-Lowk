'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, MessageCircle, TrendingUp, Users, ShoppingBag, Zap, Brain, BarChart3, Activity, Target, Lightbulb, Sparkles, Store, ShoppingCart, ArrowRight } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { Navigation } from '@/components/Navigation';
import AIResults from '@/components/AIResults';
import { AiListingsPayloadT } from '@/lib/schemas/aiListings';
import { ChatHeader } from '@/components/ai/Header';
import { QuickActions } from '@/components/ai/QuickActions';
import { ResultsGrid } from '@/components/ai/ResultsGrid';
import { CardSkeleton } from '@/components/ai/Skeletons';
import { Composer } from '@/components/ai/Composer';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  listing?: SimpleListing;
  listings?: AiListingsPayloadT;
}

interface AIStats {
  totalQueries: number;
  successfulMatches: number;
  categoriesSearched: string[];
  averageResponseTime: number;
  userSatisfaction: number;
}

type UserMode = 'buyer' | 'seller';

export default function AIPage() {
  const searchParams = useSearchParams();
  const initialQuery = (searchParams.get('query') || '').trim();
  
  // Prevent double fire on React strict mode
  const bootstrappedRef = useRef(false);
  
  const [userMode, setUserMode] = useState<UserMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-user-mode');
      return (saved === 'buyer' || saved === 'seller') ? saved : 'buyer';
    }
    return 'buyer';
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'analytics' | 'insights'>('chat');
  const [userLevel, setUserLevel] = useState<'new' | 'exploring' | 'engaged'>('new');
  const [selectedListing, setSelectedListing] = useState<SimpleListing | null>(null);
  const [stats, setStats] = useState<AIStats>({
    totalQueries: 0,
    successfulMatches: 0,
    categoriesSearched: [],
    averageResponseTime: 0.8,
    userSatisfaction: 0
  });

  // Handle mode switching with localStorage persistence
  const handleModeSwitch = (mode: UserMode) => {
    setUserMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-user-mode', mode);
    }
  };

  // Initialize messages based on user mode
  useEffect(() => {
    const initialMessage = userMode === 'buyer' 
      ? {
          id: '1',
          type: 'ai' as const,
          content: "Hi there! 👋 Welcome to All Verse GPT! I'm your personal AI shopping assistant here to help you discover amazing products and find the best deals. I can help you compare prices, suggest alternatives, and answer any questions you have about our marketplace. What are you looking for today?",
          timestamp: new Date(),
          suggestions: [
            "Help me find something",
            "Show me trending items",
            "What's popular right now?",
            "Find me the best deals"
          ]
        }
      : {
          id: '1',
          type: 'ai' as const,
          content: "Hello! 👋 Welcome to All Verse GPT! I'm your AI selling assistant here to help you optimize your listings, analyze market trends, and maximize your sales potential. I can help you with pricing strategies, competitor analysis, and market insights. What would you like to work on today?",
          timestamp: new Date(),
          suggestions: [
            "Help me price my item",
            "Analyze market trends",
            "Compare with competitors",
            "Optimize my listing"
          ]
        };
    
    setMessages([initialMessage]);
  }, [userMode]);

  // Handle query parameter from URL
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    
    if (initialQuery) {
      console.log('[AI bootstrap]', initialQuery);
      // Set the input value and send the query as the first message
      setInputValue(initialQuery);
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Clear any previous errors
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Update user stats
    setStats(prev => ({
      ...prev,
      totalQueries: prev.totalQueries + 1
    }));

    try {
      // Check if this is a listings query that should use the new API
      const isListingsQuery = shouldUseListingsAPI(message);
      console.log('🤖 Query detection:', { message, isListingsQuery });
      
      let aiMessage: Message;
      
      if (isListingsQuery) {
        // Use the new listings API for structured results
        console.log('🤖 Using listings API for:', message);
        const listingsResponse = await fetch('/api/ai/listings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: message }),
        });

        const listingsData = await listingsResponse.json();
        console.log('🤖 Listings API response:', listingsData);
        
        if (listingsData.success && listingsData.data?.items?.length > 0) {
          aiMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: '', // No text content for listings
            timestamp: new Date(),
            suggestions: ['Show more items', 'Search for something else', 'Browse categories'],
            listings: listingsData.data
          };
        } else {
          // Fallback to regular chat if listings API fails
          console.log('🤖 Listings API failed, falling back to chat API');
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              message,
              userMode: userMode
            }),
          });

          const data = await response.json();
          
          aiMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: data.response,
            timestamp: new Date(),
            suggestions: data.suggestions,
            listing: data.listing
          };
        }
      } else {
        // Use the regular chat API for conversational responses
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message,
            userMode: userMode
          }),
        });

        const data = await response.json();
        
        aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.response,
          timestamp: new Date(),
          suggestions: data.suggestions,
          listing: data.listing
        };
      }

      setMessages(prev => [...prev, aiMessage]);

      // Update user level based on interaction
      if (aiMessage.listing || aiMessage.listings) {
        setStats(prev => ({
          ...prev,
          successfulMatches: prev.successfulMatches + 1
        }));
        
        // Set selected listing for insights
        if (aiMessage.listing) {
          setSelectedListing(aiMessage.listing);
        }
        
        // Progress user level
        if (userLevel === 'new') {
          setUserLevel('exploring');
        } else if (userLevel === 'exploring' && stats.totalQueries >= 3) {
          setUserLevel('engaged');
        }
      }

      // Track categories searched
      const category = extractCategory(message);
      if (category && !stats.categoriesSearched.includes(category)) {
        setStats(prev => ({
          ...prev,
          categoriesSearched: [...prev.categoriesSearched, category]
        }));
      }

    } catch (error: any) {
      console.error('AI request failed:', error);
      
      // Log API status and body for debugging
      if (error.response) {
        console.error('API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          body: error.response.data
        });
      }
      
      const errorText = error?.message || "Something went wrong talking to the AI.";
      setError(errorText);
      
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

  const shouldUseListingsAPI = (message: string): boolean => {
    const messageLower = message.toLowerCase();
    
    // Keywords that should trigger listings API
    const listingsKeywords = [
      'show me', 'find me', 'search for', 'look for', 'browse',
      'trending', 'popular', 'best', 'deals', 'cheap', 'under',
      'electronics', 'fashion', 'home', 'sports', 'automotive',
      'iphone', 'laptop', 'shoes', 'clothes', 'furniture',
      'nike', 'adidas', 'apple', 'samsung', 'macbook'
    ];
    
    const result = listingsKeywords.some(keyword => messageLower.includes(keyword));
    console.log('🔍 shouldUseListingsAPI check:', { message, messageLower, result, matchedKeywords: listingsKeywords.filter(k => messageLower.includes(k)) });
    
    // Force true for testing
    if (messageLower.includes('trending') || messageLower.includes('show me')) {
      console.log('🚀 FORCING listings API for testing');
      return true;
    }
    
    return result;
  };

  const extractCategory = (message: string): string | null => {
    const categories = ['electronics', 'fashion', 'home', 'sports'];
    
    for (const category of categories) {
      if (message.toLowerCase().includes(category)) {
        return category;
      }
    }
    
    // Check for synonyms
    if (message.includes('phone') || message.includes('laptop') || message.includes('computer') || message.includes('tech')) {
      return 'electronics';
    }
    if (message.includes('clothes') || message.includes('shoes') || message.includes('bag') || message.includes('jacket')) {
      return 'fashion';
    }
    if (message.includes('furniture') || message.includes('table') || message.includes('sofa') || message.includes('chair')) {
      return 'home';
    }
    if (message.includes('ball') || message.includes('racket') || message.includes('mat') || message.includes('equipment')) {
      return 'sports';
    }
    
    return null;
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleListingClick = (listing: SimpleListing) => {
    window.open(`/listings/${listing.id}`, '_blank');
  };

  // Helper function to focus composer
  const focusComposer = () => {
    // This will be handled by the Composer component
  };

  // Extract results from the last message with listings
  const lastMessage = messages[messages.length - 1];
  const results = lastMessage?.listings?.items?.map(item => ({
    id: item.id,
    title: item.title,
    image: item.imageUrl,
    price: `$${item.price?.amount?.toLocaleString()}`,
    rating: item.score ? item.score * 5 : null, // Convert score to 5-star rating
    badge: item.badges?.[0] || null,
    onClick: () => handleListingClick(item)
  })) || [];

  const lastQuery = lastMessage?.listings?.meta?.query;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navigation />
      
      <ChatHeader />
      
      {/* Mode Toggle */}
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex justify-center">
          <div className="bg-zinc-800 rounded-xl p-1 border border-zinc-700">
            <div className="flex">
              <button
                onClick={() => handleModeSwitch('buyer')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
                  userMode === 'buyer'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="font-medium">Buyer Mode</span>
              </button>
              <button
                onClick={() => handleModeSwitch('seller')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
                  userMode === 'seller'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <Store className="w-4 h-4" />
                <span className="font-medium">Seller Mode</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Stats - Only show when user is engaged */}
      {userLevel !== 'new' && (
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalQueries}</p>
                  <p className="text-sm text-zinc-400">Questions Asked</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.successfulMatches}</p>
                  <p className="text-sm text-zinc-400">Items Found</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.averageResponseTime}s</p>
                  <p className="text-sm text-zinc-400">Response Time</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.categoriesSearched.length}</p>
                  <p className="text-sm text-zinc-400">Categories Explored</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' ? 'bg-blue-600' : 'bg-zinc-600'
                }`}>
                  {message.type === 'user' ? (
                    <Users className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-red-900/20 border border-red-500/30 rounded-2xl px-4 py-3">
                  <p className="text-red-400 text-sm">Error: {error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {messages[messages.length - 1]?.suggestions && (
        <QuickActions
          actions={messages[messages.length - 1].suggestions?.map(suggestion => ({
            label: suggestion,
            onClick: () => handleSuggestionClick(suggestion),
            icon: "🧭" as any
          })) || []}
        />
      )}

      {/* Results Grid */}
      {isLoading ? (
        <div className="mx-auto max-w-6xl px-4 mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <ResultsGrid items={results} query={lastQuery} />
      )}

      {/* Composer */}
      <Composer 
        value={inputValue} 
        onChange={setInputValue} 
        onSubmit={() => { 
          if (inputValue.trim()) { 
            handleSendMessage(inputValue); 
            setInputValue(""); 
          } 
        }} 
        loading={isLoading} 
      />
    </div>
  );
}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                          <Users className="w-4 h-4 text-white" />
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

                {/* Interactive Suggestions */}
                {messages[messages.length - 1]?.suggestions && (
                  <div className="space-y-3 mt-4">
                    <p className="text-white text-sm font-medium">Quick actions:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {messages[messages.length - 1].suggestions?.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="bg-accent-500/20 hover:bg-accent-500/30 border border-accent-500/30 hover:border-accent-500/50 text-white text-sm px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group"
                        >
                          <span>{suggestion}</span>
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Single Listing Card */}
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

                {/* Multiple Listings */}
                {messages[messages.length - 1]?.listings && (() => {
                  console.log('🎯 Rendering listings:', messages[messages.length - 1].listings);
                  return (
                    <div className="mt-4">
                      <AIResults data={messages[messages.length - 1].listings!} />
                    </div>
                  );
                })()}

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

                {error && (
                  <div className="flex justify-start">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-red-900/20 border border-red-500/30 rounded-2xl px-4 py-3">
                        <p className="text-red-400 text-sm">Error: {error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-6 border-t border-dark-600">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                    placeholder={userMode === 'buyer' 
                      ? "Ask me about products, deals, or recommendations..." 
                      : "Ask me about pricing, market trends, or selling strategies..."
                    }
                    className="flex-1 glass-clear-dark border border-white/20 rounded-xl px-4 py-3 text-glass placeholder:text-glass-muted focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50"
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-accent-500/80 hover:bg-accent-600/90 disabled:bg-gray-600/50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 backdrop-blur-md border border-accent-400/30"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Welcome Guide - For New Users */}
            {userLevel === 'new' && (
              <div className="bg-gradient-to-br from-accent-500/10 to-accent-600/10 border border-accent-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-accent-400" />
                  <h3 className="text-white font-semibold">Getting Started</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Ask me anything!</p>
                      <p className="text-gray-400 text-xs">Try "Show me electronics" or "Find cheap items"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Explore listings</p>
                      <p className="text-gray-400 text-xs">Click on items I suggest to see details</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Get insights</p>
                      <p className="text-gray-400 text-xs">I'll show you personalized analytics as you explore</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions - Mode specific */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-5 h-5 text-accent-400" />
                <h3 className="text-white font-semibold">
                  {userMode === 'buyer' ? 'Quick Actions' : 'Selling Tools'}
                </h3>
              </div>
              <div className="space-y-3">
                {userMode === 'buyer' ? (
                  <>
                    <button
                      onClick={() => handleSendMessage("Show me trending items")}
                      className="w-full text-left p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-4 h-4 text-accent-400" />
                        <span className="text-white text-sm">Trending Items</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSendMessage("Show me electronics")}
                      className="w-full text-left p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-4 h-4 text-accent-400" />
                        <span className="text-white text-sm">Browse Electronics</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSendMessage("Find me the best deals")}
                      className="w-full text-left p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-accent-400" />
                        <span className="text-white text-sm">Best Deals</span>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSendMessage("Help me price my item")}
                      className="w-full text-left p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Target className="w-4 h-4 text-accent-400" />
                        <span className="text-white text-sm">Price My Item</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSendMessage("Analyze market trends")}
                      className="w-full text-left p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-4 h-4 text-accent-400" />
                        <span className="text-white text-sm">Market Trends</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSendMessage("Compare with competitors")}
                      className="w-full text-left p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Brain className="w-4 h-4 text-accent-400" />
                        <span className="text-white text-sm">Competitor Analysis</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Progressive Analytics - Show when user is exploring */}
            {userLevel === 'exploring' && (
              <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-5 h-5 text-accent-400" />
                  <h3 className="text-white font-semibold">Your Activity</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Categories Explored</span>
                    <span className="text-white font-medium">{stats.categoriesSearched.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Items Found</span>
                    <span className="text-white font-medium">{stats.successfulMatches}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Questions Asked</span>
                    <span className="text-white font-medium">{stats.totalQueries}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Analytics - Show when user is engaged */}
            {userLevel === 'engaged' && (
              <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-5 h-5 text-accent-400" />
                  <h3 className="text-white font-semibold">Market Insights</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Most Searched Category</span>
                    <span className="text-white font-medium">Electronics</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Popular Keywords</span>
                    <span className="text-white font-medium">iPhone, MacBook</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Avg. Search Time</span>
                    <span className="text-white font-medium">2.3s</span>
                  </div>
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div className="bg-accent-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-400">Search accuracy: 75%</p>
                </div>
              </div>
            )}

            {/* Selected Listing Insights */}
            {selectedListing && (
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-5 h-5 text-green-400" />
                  <h3 className="text-white font-semibold">Item Insights</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={selectedListing.photos[0] || '/placeholder.jpg'}
                      alt={selectedListing.title}
                      className="w-12 h-12 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xOCAxOEgzMFYzMEgxOFYxOFoiIGZpbGw9IiM2QjcyODAiLz4KPHN2Zz4K';
                      }}
                    />
                    <div>
                      <p className="text-white text-sm font-medium">{selectedListing.title}</p>
                      <p className="text-green-400 text-sm font-semibold">${selectedListing.price.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Market Position</span>
                      <span className="text-green-400 text-sm font-medium">Good Deal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Similar Items</span>
                      <span className="text-white text-sm font-medium">12 found</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Price Trend</span>
                      <span className="text-blue-400 text-sm font-medium">Stable</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
