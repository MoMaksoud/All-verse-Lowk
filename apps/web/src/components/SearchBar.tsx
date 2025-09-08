'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp, Clock, Bot, Sparkles, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VoiceInputButton, VoiceInputStatus } from '@/components/VoiceInputButton';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Natural language search examples
  const placeholderExamples = [
    "Ask our AI anything...",
    "Search Nike shoes under $100",
    "Find gaming laptops under $1500",
    "Show me iPhone cases",
    "What's trending in electronics?",
    "Find MacBook Air deals",
    "Search for running shoes",
    "Show me home decor items",
    "Find sports equipment",
    "What's popular in fashion?",
    "Find laptops near me",
    "Show me sellers in Tampa",
    "iPhone cases within 10 miles",
    "Gaming laptops in Miami",
    "Local electronics sellers"
  ];

  // Mock search suggestions
  const suggestions = [
    { id: 1, text: 'iPhone 14 Pro', type: 'trending' },
    { id: 2, text: 'MacBook Air', type: 'trending' },
    { id: 3, text: 'Gaming Laptop', type: 'trending' },
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearches = (searches: string[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('recentSearches', JSON.stringify(searches));
        setRecentSearches(searches);
      } catch (error) {
        console.error('Error saving recent searches:', error);
      }
    }
  };

  // Add search to recent searches
  const addToRecentSearches = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    const trimmedTerm = searchTerm.trim();
    const updated = [trimmedTerm, ...recentSearches.filter(s => s !== trimmedTerm)].slice(0, 5);
    saveRecentSearches(updated);
  };

  // Remove individual recent search
  const removeRecentSearch = (searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== searchTerm);
    saveRecentSearches(updated);
  };

  // Clear all recent searches
  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveRecentSearches([]);
  };

  // Rotate placeholder examples
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholderExamples.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [placeholderExamples.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim()) {
      // Add to recent searches
      addToRecentSearches(searchQuery);
      
      setIsSearching(true);
      
      try {
        // Try AI-powered search first
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: searchQuery }),
        });

        const data = await response.json();
        
        if (data.listing) {
          // If AI found a specific listing, go to it
          router.push(`/listings/${data.listing.id}`);
        } else {
          // Otherwise, do regular search
          router.push(`/listings?q=${encodeURIComponent(searchQuery)}`);
        }
      } catch (error) {
        // Fallback to regular search
        router.push(`/listings?q=${encodeURIComponent(searchQuery)}`);
      } finally {
        setIsSearching(false);
        setShowSuggestions(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    setVoiceError(null);
    setVoiceTranscript('');
  };

  const handleVoiceResult = (text: string) => {
    setQuery(text);
    setVoiceTranscript(text);
    setVoiceError(null);
    // Auto-submit voice input after a short delay
    setTimeout(() => {
      handleSearch(text);
    }, 1000);
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
    setIsVoiceListening(false);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Bot className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-accent-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => setShowSuggestions(query.length > 0)}
            placeholder={placeholderExamples[currentPlaceholder]}
            className="w-full pl-12 pr-12 py-4 glass-clear-dark border border-white/20 rounded-2xl text-glass placeholder:text-glass-muted focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50 transition-all duration-200 placeholder-transition"
          />
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
            <Sparkles className="w-4 h-4 text-accent-400 animate-pulse" />
          </div>
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          <VoiceInputButton
            onResult={handleVoiceResult}
            onError={handleVoiceError}
            size="sm"
            className="glass-button-dark hover:bg-black/30"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="bg-accent-500/80 hover:bg-accent-600/90 backdrop-blur-md text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 border border-accent-400/30"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                Ask AI
              </>
            )}
          </button>
        </div>
      </form>

      {/* Voice Input Status */}
      <VoiceInputStatus 
        isListening={isVoiceListening}
        transcript={voiceTranscript}
        error={voiceError}
      />

      {/* Natural Language Hint */}
      {!query && !showSuggestions && (
        <div className="mt-2 text-center">
          <p className="text-xs text-glass-muted">
            💡 Try asking naturally: "Find laptops under $1000" or "Show me sellers in Tampa"
          </p>
        </div>
      )}

      {/* Search Suggestions */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-clear-dark rounded-xl border border-white/20 shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            {/* Trending Searches */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-accent-400" />
                <span className="text-sm font-medium text-glass-muted">Trending</span>
              </div>
              <div className="space-y-2">
                {suggestions.filter(s => s.type === 'trending').map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full text-left px-3 py-2 rounded-lg glass-button-dark hover:bg-black/20 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-gray-400 group-hover:text-accent-400" />
                      <span className="text-glass-muted group-hover:text-glass">{suggestion.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-glass-muted">Recent</span>
                  </div>
                  <button
                    onClick={clearAllRecentSearches}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full text-left px-3 py-2 rounded-lg glass-button-dark hover:bg-black/20 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-400 group-hover:text-accent-400" />
                          <span className="text-glass-muted group-hover:text-glass">{search}</span>
                        </div>
                        <button
                          onClick={(e) => removeRecentSearch(search, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-dark-600 transition-all"
                        >
                          <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Categories */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="text-sm font-medium text-glass-muted mb-3">Quick Categories</div>
              <div className="grid grid-cols-2 gap-2">
                {['Electronics', 'Fashion', 'Home', 'Sports'].map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      router.push(`/listings?category=${category.toLowerCase()}`);
                      setShowSuggestions(false);
                    }}
                    className="px-3 py-2 text-sm glass-button-dark rounded-lg hover:bg-black/20 transition-all duration-200 text-glass-muted hover:text-glass"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
