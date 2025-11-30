'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Grid, List, ChevronLeft, ChevronRight, Heart, MessageCircle, ShoppingCart } from 'lucide-react';
import { SimpleListing, ListingFilters, Category } from '@marketplace/types';
import ListingCard from '@/components/ListingCard';
import { ListingFilters as ListingFiltersComponent } from '@/components/ListingFilters';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Select from '@/components/Select';
import ListingCollection from '@/components/ListingCollection';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStartChatFromListing } from '@/lib/messaging';

function ListingsContent() {
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();
  const [listings, setListings] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [appliedFilters, setAppliedFilters] = useState<ListingFilters>({});
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (appliedFilters.keyword) params.set('q', appliedFilters.keyword);
      if (appliedFilters.category) params.set('category', appliedFilters.category);
      if (appliedFilters.condition) params.set('condition', appliedFilters.condition);
      if (appliedFilters.minPrice !== undefined) params.set('min', appliedFilters.minPrice.toString());
      if (appliedFilters.maxPrice !== undefined) params.set('max', appliedFilters.maxPrice.toString());
      params.set('page', currentPage.toString());
      params.set('limit', '9'); // Reduced from 12 to 9 for faster loading
    
      // Add sort parameter
      switch (sortBy) {
        case 'price-low':
          params.set('sort', 'priceAsc');
          break;
        case 'price-high':
          params.set('sort', 'priceDesc');
          break;
        case 'newest':
        default:
          params.set('sort', 'recent');
          break;
      }

      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet(`/api/listings?${params.toString()}`, { requireAuth: false });
      const data = await response.json();


      if (response.ok) {
        setListings(data.data || []);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / 9));
      } else {
        setListings([]);
        setTotalPages(1);
      }
      
      // Fetch categories
      const categoriesResponse = await apiGet('/api/categories', { requireAuth: false });
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
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

    
    setAppliedFilters(newFilters);
    setCurrentPage(1);
  }, [searchParams]);


  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);


  const handleMessageClick = useCallback(async (listing: SimpleListing) => {
    if (!currentUser) {
      showError('Sign In Required', 'Please sign in to message sellers.');
      return;
    }

    if (!listing.sellerId) {
      showError('Error', 'Unable to find seller information.');
      return;
    }

    try {
      await startChat({
        listingId: listing.id,
        sellerId: listing.sellerId,
        listingTitle: listing.title,
        listingPrice: listing.price,
        initialMessage: `Hi! I'm interested in your ${listing.title}. Is it still available?`,
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      showError('Failed to start chat', 'Please try again later.');
    }
  }, [currentUser, startChat, showError]);

  const addToCart = useCallback(async (listing: SimpleListing) => {
    if (!currentUser) {
      showError('Please sign in to add items to cart');
      return;
    }

    setAddingToCart(listing.id);
    try {
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/carts', {
        listingId: listing.id,
        sellerId: listing.sellerId || 'test-seller',
        qty: 1,
        priceAtAdd: listing.price,
      });

      if (response.ok) {
        showSuccess('Added to cart!');
      } else {
        showError('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showError('Error adding to cart');
    } finally {
      setAddingToCart(null);
    }
  }, [currentUser, showSuccess, showError]);

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
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 px-2 break-words">
            Browse Listings
          </h1>
          <p className="text-base sm:text-lg text-gray-400 px-4">
            Discover amazing items with AI-powered recommendations
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <ListingFiltersComponent
              filters={appliedFilters}
              categories={categories}
              onFiltersChange={setAppliedFilters}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-xs sm:text-sm text-gray-400">
                {listings.length} listings found
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                {/* Sort Dropdown */}
                <div className="flex items-center flex-1 sm:flex-initial min-w-0">
                  <Select
                    value={sortBy}
                    onChange={(value) => setSortBy(value as typeof sortBy)}
                    options={[
                      { value: 'newest', label: 'Newest' },
                      { value: 'price-low', label: 'Price: Low to High' },
                      { value: 'price-high', label: 'Price: High to Low' }
                    ]}
                    placeholder="Sort by"
                    className="w-full sm:min-w-[180px]"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-dark-600 rounded-xl bg-dark-800 flex-shrink-0">
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
                {viewMode === 'grid' ? (
                  <ListingCollection 
                    items={listings.map(listing => ({
                      id: listing.id,
                      title: listing.title,
                      description: listing.description,
                      price: listing.price,
                      category: listing.category,
                      condition: listing.condition,
                      imageUrl: listing.photos?.[0] || null,
                      sellerId: listing.sellerId
                    }))}
                    view="grid"
                  />
                ) : (
                  <ListingCollection 
                    items={listings.map(listing => ({
                      id: listing.id,
                      title: listing.title,
                      description: listing.description,
                      price: listing.price,
                      category: listing.category,
                      condition: listing.condition,
                      imageUrl: listing.photos?.[0] || null,
                      sellerId: listing.sellerId
                    }))}
                    view="list"
                  />
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
              <div className="text-center py-8 sm:py-12 px-4">
                <div className="text-gray-400 text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
                <h3 className="text-base sm:text-lg font-medium text-white mb-1 sm:mb-2">
                  No listings found
                </h3>
                <p className="text-sm sm:text-base text-gray-400">
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
