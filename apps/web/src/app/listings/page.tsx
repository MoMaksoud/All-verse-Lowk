'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { ListingWithSeller, Category, ListingFilters } from '@marketplace/types';
import { ListingCard } from '@/components/ListingCard';
import { ListingFilters as ListingFiltersComponent } from '@/components/ListingFilters';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';

function ListingsContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ListingFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (filters.keyword) params.set('q', filters.keyword);
        if (filters.category) params.set('category', filters.category);
        if (filters.minPrice !== undefined) params.set('min', filters.minPrice.toString());
        if (filters.maxPrice !== undefined) params.set('max', filters.maxPrice.toString());
        params.set('page', currentPage.toString());
        params.set('limit', '12');

        const [listingsResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/listings?${params.toString()}`).then(res => res.json()),
          fetch('/api/categories').then(res => res.json()),
        ]);

        if (listingsResponse.success) {
          setListings(listingsResponse.data.items);
          setTotalPages(Math.ceil(listingsResponse.data.total / 12));
        }
        
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data);
        }
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, currentPage]);

  useEffect(() => {
    // Parse URL params for filters
    const category = searchParams.get('category');
    const keyword = searchParams.get('q'); // Changed from 'keyword' to 'q'
    const minPrice = searchParams.get('min');
    const maxPrice = searchParams.get('max');

    const newFilters: ListingFilters = {};
    if (category) newFilters.category = category;
    if (keyword) newFilters.keyword = keyword;
    if (minPrice) newFilters.minPrice = parseFloat(minPrice);
    if (maxPrice) newFilters.maxPrice = parseFloat(maxPrice);

    setFilters(newFilters);
    setCurrentPage(1);
  }, [searchParams]);

  const handleFilterChange = (newFilters: ListingFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-500"></div>
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
            <ListingFiltersComponent
              filters={filters}
              categories={categories}
              onFiltersChange={handleFilterChange}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-400">
                {listings.length} listings found
              </div>
              
              <div className="flex items-center space-x-4">
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
            {listings.length > 0 ? (
              <>
                <div
                  className={`grid gap-6 ${
                    viewMode === 'grid'
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                      : 'grid-cols-1'
                  }`}
                >
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                    />
                  ))}
                </div>

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
