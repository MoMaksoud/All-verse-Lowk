'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, TrendingUp, Camera } from 'lucide-react';
import { ImageSearchModal } from '@/components/search/ImageSearchModal';
import { getPopularSearches } from '@/lib/searchAnalytics';

const POPULAR_LIMIT = 4;

export function UniversalSearchHero() {
  const [query, setQuery] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const router = useRouter();
  const popularSearches = useMemo(() => getPopularSearches(POPULAR_LIMIT).map((q) => q.query), []);

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
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-white max-w-3xl mx-auto drop-shadow-lg px-4" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
              One search. Every marketplace. AI-powered insights that help you buy smarter.
            </p>
          </div>

          {/* Universal Search Bar */}
          <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-500/20 to-primary-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative flex items-center w-full bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl hover:border-accent-500/50 transition-all duration-300 min-h-12 sm:min-h-14">
                {/* Search icon inside input (left) */}
                <div className="flex items-center justify-center pl-4 sm:pl-5 shrink-0 text-white/90" aria-hidden>
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for electronics, fashion, home goods..."
                  className="flex-1 min-w-0 bg-transparent text-white placeholder-white/60 px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg outline-none"
                  autoComplete="off"
                />
                {/* Camera: hidden on mobile (shown in row below), visible sm+ */}
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="hidden sm:flex items-center justify-center m-2 p-2.5 sm:p-3 min-h-[44px] min-w-[44px] sm:min-w-0 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all duration-200 shrink-0"
                  title="Search by image"
                  aria-label="Search by image"
                >
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                {/* Submit: icon-only on mobile, icon+text on sm+, min tap area 44px */}
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="flex items-center justify-center m-2 px-4 sm:px-6 sm:px-8 min-h-[44px] min-w-[44px] sm:min-w-0 py-3 sm:py-4 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 gap-2 shadow-lg shrink-0"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </div>

            {/* Search by image: stacked below on mobile with spacing */}
            <div className="mt-4 sm:mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] sm:py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-full text-white/90 text-sm transition-all duration-200"
              >
                <Camera className="w-4 h-4 text-accent-400 shrink-0" />
                Search by image
              </button>
            </div>

            {/* Popular searches from analytics */}
            <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
              <span className="text-white/70">Popular:</span>
              {popularSearches.map((term) => (
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
      <ImageSearchModal isOpen={showImageModal} onClose={() => setShowImageModal(false)} />
    </section>
  );
}

