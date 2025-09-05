'use client';

import React, { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Filter, Grid, List, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { ListingCard } from '@/components/ListingCard';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function ListingsContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [localFilters, setLocalFilters] = useState({
    keyword: '',
    category: '',
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    category: '',
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'rating'>('newest');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (appliedFilters.keyword) params.set('q', appliedFilters.keyword);
      if (appliedFilters.category) params.set('category', appliedFilters.category);
      if (appliedFilters.minPrice !== undefined) params.set('min', appliedFilters.minPrice.toString());
      if (appliedFilters.maxPrice !== undefined) params.set('max', appliedFilters.maxPrice.toString());
      params.set('page', currentPage.toString());
      params.set('limit', '12');
      
      console.log('Applied filters:', appliedFilters);
      console.log('API URL:', `/api/listings?${params.toString()}`);
      
      // Add sort parameter
      switch (sortBy) {
        case 'price-low':
          params.set('sort', 'priceAsc');
          break;
        case 'price-high':
          params.set('sort', 'priceDesc');
          break;
        case 'rating':
          params.set('sort', 'rating');
          break;
        case 'newest':
        default:
          params.set('sort', 'recent');
          break;
      }

      const response = await fetch(`/api/listings?${params.toString()}`);
      const data = await response.json();

      console.log('API Response:', data);

      if (response.ok) {
        setListings(data.data || []);
        setTotalPages(Math.ceil((data.total || 0) / 12));
      } else {
        setListings([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setListings([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Parse URL params for filters
    const category = searchParams.get('category');
    const keyword = searchParams.get('q');
    const minPrice = searchParams.get('min');
    const maxPrice = searchParams.get('max');

    const newFilters = {
      keyword: keyword || '',
      category: category || '',
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    };

    setLocalFilters(newFilters);
    setAppliedFilters(newFilters);
    setCurrentPage(1);
  }, [searchParams]);

  const handleLocalFilterChange = useCallback((newFilters: typeof localFilters) => {
    setLocalFilters(newFilters);
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters(localFilters);
    setCurrentPage(1);
  }, [localFilters]);

  const handleClearFilters = useCallback(() => {
    const clearedFilters = {
      keyword: '',
      category: '',
      minPrice: undefined,
      maxPrice: undefined,
    };
    setLocalFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    setCurrentPage(1);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyFilters();
    }
  }, [handleApplyFilters]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const memoizedListings = useMemo(() => listings, [listings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navigation />
        <LoadingSpinner size="lg" text="Loading listings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Browse Listings
          </h1>
          <p className="text-lg text-gray-400">
            Discover amazing items with AI-powered recommendations
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80">
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
              <h3 className="text-lg font-semibold text-white mb-6">Filters</h3>
              
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Search
                </label>
                <input
                  type="text"
                  value={localFilters.keyword}
                  onChange={(e) => handleLocalFilterChange({ ...localFilters, keyword: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder="Search listings..."
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Category
                </label>
                <select
                  value={localFilters.category}
                  onChange={(e) => handleLocalFilterChange({ ...localFilters, category: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
                >
                  <option value="">All Categories</option>
                  <option value="electronics">Electronics</option>
                  <option value="fashion">Fashion</option>
                  <option value="home">Home</option>
                  <option value="sports">Sports</option>
                  <option value="automotive">Automotive</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={localFilters.minPrice || ''}
                    onChange={(e) => handleLocalFilterChange({ 
                      ...localFilters, 
                      minPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    onKeyPress={handleKeyPress}
                    placeholder="Min"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 appearance-none text-sm"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                  />
                  <input
                    type="number"
                    value={localFilters.maxPrice || ''}
                    onChange={(e) => handleLocalFilterChange({ 
                      ...localFilters, 
                      maxPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    onKeyPress={handleKeyPress}
                    placeholder="Max"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 appearance-none text-sm"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                  />
                </div>
              </div>

              {/* Apply Filters Button */}
              <button
                onClick={handleApplyFilters}
                className="w-full px-4 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium transition-all duration-200 mb-3"
              >
                Apply Filters
              </button>

              {/* Clear Filters Button */}
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-gray-300 hover:bg-dark-600 hover:text-white transition-all duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-400">
                {listings.length} listings found
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Sort Dropdown */}
                <div className="flex items-center">
                  <label className="text-sm text-gray-400 mr-2">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
                  >
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-dark-600 rounded-xl bg-dark-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-l-xl transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-accent-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-r-xl transition-all duration-200 ${
                      viewMode === 'list'
                        ? 'bg-accent-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            {memoizedListings.length > 0 ? (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {memoizedListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {memoizedListings.map((listing) => (
                      <div key={listing.id} className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden hover:bg-dark-700 transition-all duration-200">
                        <Link href={`/listings/${listing.id}`} className="group">
                          <div className="flex">
                            {/* Image - Compact */}
                            <div className="relative w-32 h-24 flex-shrink-0 bg-dark-700">
                              {listing.photos && listing.photos.length > 0 && listing.photos[0] ? (
                                <img
                                  src={listing.photos[0]}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  No Image
                                </div>
                              )}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 p-4 flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-white truncate group-hover:text-accent-400 transition-colors">
                                  {listing.title}
                                </h3>
                                <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                  {listing.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                  <span className="text-accent-400 font-semibold">${listing.price}</span>
                                  <span>•</span>
                                  <span className="capitalize">{listing.category}</span>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-2 ml-4">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Add favorite functionality here
                                  }}
                                  className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
                                >
                                  <Heart className="w-4 h-4 text-gray-400" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Add message functionality here
                                  }}
                                  className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center mt-12">
                    <nav className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="btn-ghost p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                            currentPage === page
                              ? 'bg-accent-500 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-dark-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="btn-ghost p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-white mb-2">
                  No listings found
                </h3>
                <p className="text-gray-400">
                  Try adjusting your filters or search terms
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-500"></div>
      </div>
    }>
      <ListingsContent />
    </Suspense>
  );
}
