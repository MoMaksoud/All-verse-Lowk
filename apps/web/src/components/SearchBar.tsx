'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, Bot, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setAutocompleteSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`, { requireAuth: false });
      const data = await response.json();
      
      // API returns { query, suggestions, count, types } directly
      if (data && Array.isArray(data.suggestions)) {
        setAutocompleteSuggestions(data.suggestions);
      } else {
        setAutocompleteSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setAutocompleteSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Debounced search for suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) { // Increased from 1 to 2 for better performance
        fetchSuggestions(query);
      } else {
        setAutocompleteSuggestions([]);
      }
    }, 300); // Increased delay for better performance

    return () => clearTimeout(timeoutId);
  }, [query]);

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

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      // Add to recent searches
      addToRecentSearches(searchQuery);
      
      // Navigate to AI Assistant page with query parameter
      router.push(`/ai-assistant?query=${encodeURIComponent(searchQuery)}`);
      
      setShowSuggestions(false);
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
    <div ref={searchRef} className={`relative z-50 ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Bot className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-accent-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Ask our AI anything..."
            className="w-full pl-12 pr-32 py-4 glass-clear-dark border border-white/20 rounded-2xl text-glass placeholder:text-glass-muted focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50 transition-all duration-200 placeholder-transition"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="bg-accent-500/80 hover:bg-accent-600/90 backdrop-blur-md text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border border-accent-400/30"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </div>
      </form>

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
        <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 rounded-xl border border-dark-600 shadow-2xl z-[9999] max-h-96 overflow-y-auto">
          <div className="p-4">
            {/* Autocomplete Suggestions */}
            {query.length >= 2 && autocompleteSuggestions.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-accent-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {isLoadingSuggestions ? 'Finding suggestions...' : `Suggestions (${autocompleteSuggestions.length})`}
                  </span>
                </div>
                <div className="space-y-1">
                  {isLoadingSuggestions ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-400"></div>
                    </div>
                  ) : (
                    autocompleteSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-dark-700/50 hover:bg-dark-600 transition-all duration-200 group border border-transparent hover:border-dark-500"
                      >
                        <div className="flex items-center gap-3">
                          <Search className="w-4 h-4 text-gray-400 group-hover:text-accent-400 transition-colors" />
                          <span className="text-gray-300 group-hover:text-white transition-colors">{suggestion}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* No suggestions message - only show if we've actually tried to fetch (query >= 2 chars) */}
            {query.length >= 2 && autocompleteSuggestions.length === 0 && !isLoadingSuggestions && (
              <div className="mb-4">
                <div className="text-center py-4 text-gray-400 text-sm">
                  No suggestions found for "{query}"
                </div>
              </div>
            )}


            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">Recent</span>
                  </div>
                  <button
                    onClick={clearAllRecentSearches}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <div
                      key={index}
                      className="w-full text-left px-3 py-2 rounded-lg bg-dark-700/50 hover:bg-dark-600 transition-all duration-200 group border border-transparent hover:border-dark-500 cursor-pointer"
                      onClick={() => handleSuggestionClick(search)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-400 group-hover:text-accent-400 transition-colors" />
                          <span className="text-gray-300 group-hover:text-white transition-colors">{search}</span>
                        </div>
                        <button
                          onClick={(e) => removeRecentSearch(search, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-dark-600 transition-all"
                        >
                          <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    className="px-3 py-2 text-sm bg-dark-700/50 hover:bg-dark-600 rounded-lg transition-all duration-200 text-gray-300 hover:text-white border border-transparent hover:border-dark-500"
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
