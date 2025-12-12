'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, TrendingUp } from 'lucide-react';

export function UniversalSearchHero() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?query=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-accent-500/10 border border-accent-500/20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 mb-4 sm:mb-6 backdrop-blur-sm text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent-400" />
              <span className="text-accent-400 font-medium">Universal AI Shopping Search</span>
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-accent-400 animate-pulse" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 text-gradient drop-shadow-lg px-2 break-words">
              Find Anything, Anywhere
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-white max-w-3xl mx-auto drop-shadow-lg px-4" style={{textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'}}>
              Search across Amazon, eBay, Etsy, and All Verse GPT marketplace with AI-powered insights
            </p>
          </div>

          {/* Universal Search Bar */}
          <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-500/20 to-primary-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative flex items-center bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl hover:border-accent-500/50 transition-all duration-300">
                <div className="pl-4 sm:pl-6">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for electronics, fashion, home goods..."
                  className="flex-1 bg-transparent text-white placeholder-white/60 px-4 py-4 sm:py-5 text-base sm:text-lg outline-none"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="m-2 px-6 sm:px-8 py-3 sm:py-4 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </div>

            {/* Popular searches */}
            <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
              <span className="text-white/70">Popular:</span>
              {['iPhone 14', 'Nike Shoes', 'MacBook', 'Gaming Chair'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    router.push(`/search?query=${encodeURIComponent(term)}`);
                  }}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-full text-white transition-all duration-200"
                >
                  {term}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

