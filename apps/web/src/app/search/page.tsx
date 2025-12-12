'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { DynamicBackground } from '@/components/DynamicBackground';
import { AISummarySection } from '@/components/search/AISummarySection';
import { ExternalResultsSection } from '@/components/search/ExternalResultsSection';
import { InternalResultsSection } from '@/components/search/InternalResultsSection';
import { SellCTASection } from '@/components/search/SellCTASection';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlertCircle, Search, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

interface SearchResults {
  externalResults: Array<{
    title: string;
    price: number;
    source: string;
    url: string;
    image?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
  }>;
  internalResults: Array<{
    id: string;
    title: string;
    price: number;
    description: string;
    photos: string[];
    category: string;
    condition: string;
    sellerId: string;
  }>;
  summary: {
    overview: string;
    priceRange?: {
      min: number;
      max: number;
      average: number;
    };
    topRecommendations?: string[];
    marketInsights?: string[];
  } | null;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('query');
  const [query, setQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [mounted, setMounted] = useState(false);
  
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fix hydration: sync query after mount
  useEffect(() => {
    setMounted(true);
    if (queryParam) {
      setQuery(queryParam);
      setSearchInput(queryParam);
    } else {
      router.push('/');
    }
  }, [queryParam, router]);

  useEffect(() => {
    if (!mounted || !query) return;

    const fetchSearchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const { apiGet } = await import('@/lib/api-client');
        const response = await apiGet(
          `/api/universal-search?q=${encodeURIComponent(query)}`,
          { requireAuth: false }
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch search results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, mounted]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  // Always render the same structure to prevent hydration mismatch
  return (
    <div className="min-h-screen bg-dark-950">
      <DynamicBackground intensity="low" showParticles={false} />
      <Navigation />

      {/* Persistent Search Bar */}
      <div className="sticky top-0 z-40 bg-dark-950/95 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden hover:border-accent-500/50 transition-all">
                <div className="pl-4">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search for products..."
                  className="flex-1 bg-transparent text-white placeholder-white/60 px-4 py-3 outline-none"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!searchInput.trim()}
                  className="m-2 px-6 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                >
                  Search
                </button>
              </div>
            </form>

            <Link
              href="/"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Home"
            >
              <Home className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Search Header - Always render to prevent hydration mismatch */}
      <div className="relative py-6 border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {mounted && query ? `Search Results for "${query}"` : 'Search Results'}
          </h1>
          <p className="text-gray-400">
            {!mounted || !query
              ? 'Loading...'
              : loading
              ? 'Searching across marketplaces...'
              : results
              ? `Found ${(results.externalResults?.length || 0) + (results.internalResults?.length || 0)} results`
              : 'No results found'}
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-1">
                Search Error
              </h3>
              <p className="text-red-300">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(!mounted || !query || loading) && !error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <LoadingSpinner size="lg" text="Searching across the web..." />
        </div>
      )}

      {/* Results */}
      {mounted && query && !loading && !error && results && (
        <>
          { (results.externalResults?.length || results.internalResults?.length) > 0 && (
            <AISummarySection
              summary={results.summary}
              query={query}
              hasResults={(results.externalResults?.length || 0) + (results.internalResults?.length || 0) > 0}
            />
          )}

          {/* Internal Results - AllVerse GPT Marketplace FIRST */}
          {results.internalResults && results.internalResults.length > 0 && (
            <div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  AllVerse GPT Marketplace
                </h2>
                <p className="text-gray-400">
                  From our community
                </p>
              </div>
              <InternalResultsSection results={results.internalResults} />
            </div>
          )}

          {/* External Results - Other Marketplaces SECOND */}
          {results.externalResults && results.externalResults.length > 0 && (
            <div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  From Other Marketplaces
                </h2>
                <p className="text-gray-400">
                  Showing results from Amazon, eBay, Walmart, and more
                </p>
              </div>
              <ExternalResultsSection results={results.externalResults} />
            </div>
          )}

          {/* No Results State */}
          {(!results.externalResults || results.externalResults.length === 0) &&
            (!results.internalResults || results.internalResults.length === 0) && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Try searching with different keywords or browse our marketplace
                  </p>
                  <button
                    onClick={() => router.push('/listings')}
                    className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl transition-colors"
                  >
                    Browse All Listings
                  </button>
                </div>
              </div>
            )}

          {/* Sell CTA */}
          <SellCTASection />
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-950">
          <Navigation />
          <LoadingSpinner size="lg" text="Loading search..." />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

