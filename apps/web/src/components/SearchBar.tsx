'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp, Clock, Bot, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Mock search suggestions
  const suggestions = [
    { id: 1, text: 'iPhone 14 Pro', type: 'trending' },
    { id: 2, text: 'MacBook Air', type: 'trending' },
    { id: 3, text: 'Nike Air Max', type: 'recent' },
    { id: 4, text: 'Samsung Galaxy', type: 'recent' },
    { id: 5, text: 'Gaming Laptop', type: 'trending' },
  ];

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
            placeholder="Ask our AI anything..."
            className="w-full pl-12 pr-12 py-4 bg-dark-800/90 border border-dark-600 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200"
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
        
        <button
          type="submit"
          disabled={isSearching}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
      </form>

      {/* Search Suggestions */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 rounded-xl border border-dark-600 shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            {/* Trending Searches */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-accent-400" />
                <span className="text-sm font-medium text-gray-300">Trending</span>
              </div>
              <div className="space-y-2">
                {suggestions.filter(s => s.type === 'trending').map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-gray-400 group-hover:text-accent-400" />
                      <span className="text-gray-300 group-hover:text-white">{suggestion.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Recent</span>
              </div>
              <div className="space-y-2">
                {suggestions.filter(s => s.type === 'recent').map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400 group-hover:text-accent-400" />
                      <span className="text-gray-300 group-hover:text-white">{suggestion.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Categories */}
            <div className="mt-4 pt-4 border-t border-dark-600">
              <div className="text-sm font-medium text-gray-300 mb-3">Quick Categories</div>
              <div className="grid grid-cols-2 gap-2">
                {['Electronics', 'Fashion', 'Home', 'Sports'].map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      router.push(`/listings?category=${category.toLowerCase()}`);
                      setShowSuggestions(false);
                    }}
                    className="px-3 py-2 text-sm bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors text-gray-300 hover:text-white"
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
