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
  const [showListingModal, setShowListingModal] = useState(false);
  const [modalListing, setModalListing] = useState<any>(null);
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
    const listingKeywords = [
      'show me', 'find me', 'search for', 'looking for', 'need', 'want',
      'buy', 'purchase', 'get', 'electronics', 'phone', 'laptop', 'computer',
      'clothes', 'shoes', 'fashion', 'home', 'furniture', 'sports',
      'books', 'games', 'accessories', 'deals', 'cheap', 'affordable',
      'under', 'below', 'price', 'cost', 'budget'
    ];
    
    return listingKeywords.some(keyword => messageLower.includes(keyword));
  };

  const extractCategory = (message: string): string | null => {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('electronics') || messageLower.includes('phone') || messageLower.includes('laptop') || messageLower.includes('computer')) {
      return 'electronics';
    }
    if (messageLower.includes('clothes') || messageLower.includes('shoes') || messageLower.includes('fashion')) {
      return 'fashion';
    }
    if (messageLower.includes('home') || messageLower.includes('furniture')) {
      return 'home';
    }
    if (messageLower.includes('sports') || messageLower.includes('fitness') || messageLower.includes('exercise')) {
      return 'sports';
    }
    
    return null;
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleListingClick = (listing: any) => {
    // Show modal with listing details since these are AI-generated mock listings
    setModalListing(listing);
    setShowListingModal(true);
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
    price: `$${item.price?.value?.toLocaleString()}`,
    rating: item.score ? item.score * 5 : null, // Convert score to 5-star rating
    badge: item.badges?.[0] || null,
    onClick: () => handleListingClick(item as unknown as SimpleListing)
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

      {/* Listing Detail Modal */}
      {showListingModal && modalListing && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowListingModal(false)}
        >
          <div 
            className="bg-zinc-900 rounded-2xl border border-zinc-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Listing Details</h2>
                <button
                  onClick={() => setShowListingModal(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Image */}
                <div className="aspect-[4/3] w-full bg-zinc-800 rounded-xl overflow-hidden">
                  {modalListing.imageUrl ? (
                    <img
                      src={modalListing.imageUrl}
                      alt={modalListing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      No Image Available
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{modalListing.title}</h3>
                    <p className="text-2xl font-bold text-blue-400">
                      ${modalListing.price?.value?.toLocaleString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-zinc-400 text-sm">Condition</span>
                      <p className="text-white font-medium">{modalListing.condition}</p>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-sm">Location</span>
                      <p className="text-white font-medium">{modalListing.location}</p>
                    </div>
                  </div>

                  {modalListing.badges && modalListing.badges.length > 0 && (
                    <div>
                      <span className="text-zinc-400 text-sm">Badges</span>
                      <div className="flex gap-2 mt-1">
                        {modalListing.badges.map((badge: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-400 font-medium">AI Suggestion</span>
                    </div>
                    <p className="text-zinc-300 text-sm">
                      This is an AI-generated suggestion based on your search. Click below to find similar real listings in our marketplace.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-zinc-700">
                  <button
                    onClick={() => {
                      const searchQuery = encodeURIComponent(modalListing.title);
                      window.open(`/listings?q=${searchQuery}`, '_blank');
                      setShowListingModal(false);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                  >
                    Find Similar Listings
                  </button>
                  <button
                    onClick={() => {
                      window.open('/listings', '_blank');
                      setShowListingModal(false);
                    }}
                    className="px-4 py-3 border border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-500 rounded-xl transition-colors"
                  >
                    Browse All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
