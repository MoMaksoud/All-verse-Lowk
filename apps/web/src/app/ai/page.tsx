'use client';

import React, { useState, useEffect } from 'react';
import { Bot, MessageCircle, TrendingUp, Users, ShoppingBag, Zap, Brain, BarChart3, Activity, Target, Lightbulb, Sparkles } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { Navigation } from '@/components/Navigation';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  listing?: SimpleListing;
}

interface AIStats {
  totalQueries: number;
  successfulMatches: number;
  categoriesSearched: string[];
  averageResponseTime: number;
  userSatisfaction: number;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi there! 👋 Welcome to All Verse GPT! I'm your personal AI assistant here to help you discover amazing products and navigate our marketplace. I can help you find exactly what you're looking for, suggest great deals, and answer any questions you have. What brings you here today?",
      timestamp: new Date(),
      suggestions: [
        "Help me find something",
        "Show me trending items",
        "What's popular right now?",
        "I'm just browsing"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

    // Update user stats
    setStats(prev => ({
      ...prev,
      totalQueries: prev.totalQueries + 1
    }));

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

      // Update user level based on interaction
      if (data.listing) {
        setStats(prev => ({
          ...prev,
          successfulMatches: prev.successfulMatches + 1
        }));
        
        // Set selected listing for insights
        setSelectedListing(data.listing);
        
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

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Assistant
          </h1>
          <p className="text-lg text-gray-400">
            Your personal shopping companion
          </p>
        </div>

        {/* Progressive Stats - Only show when user is engaged */}
        {userLevel !== 'new' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-accent-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalQueries}</p>
                  <p className="text-sm text-gray-400">Questions Asked</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.successfulMatches}</p>
                  <p className="text-sm text-gray-400">Items Found</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.averageResponseTime}s</p>
                  <p className="text-sm text-gray-400">Response Time</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.categoriesSearched.length}</p>
                  <p className="text-sm text-gray-400">Categories Explored</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <div className="card h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-6 border-b border-dark-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-500 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">All Verse AI Assistant</h3>
                    <p className="text-gray-400 text-sm">Always ready to help</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm">Online</span>
                </div>
              </div>

              {/* Messages */}
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
              </div>

              {/* Input */}
              <div className="p-6 border-t border-dark-600">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                    placeholder="Ask me anything about our marketplace..."
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

            {/* Quick Actions - Always visible */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-5 h-5 text-accent-400" />
                <h3 className="text-white font-semibold">Quick Actions</h3>
              </div>
              <div className="space-y-3">
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
                  onClick={() => handleSendMessage("What's popular right now?")}
                  className="w-full text-left p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-accent-400" />
                    <span className="text-white text-sm">What's Popular</span>
                  </div>
                </button>
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
