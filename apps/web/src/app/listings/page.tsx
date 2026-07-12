'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Grid, List, Loader2 } from 'lucide-react';
import { SimpleListing, ListingFilters, Category } from '@marketplace/types';
import ListingCard from '@/components/ListingCard';
import { ListingFilters as ListingFiltersComponent } from '@/components/ListingFilters';
import { Logo } from '@/components/Logo';
import Select from '@/components/Select';
import ListingCollection from '@/components/ListingCollection';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStartChatFromListing } from '@/lib/messaging';
import { OtherMarketplacesFeed } from '@/components/OtherMarketplacesFeed';

function ListingsContent() {
  const pageSize = 24;
  const searchParams = useSearchParams();
  const { currentUser, userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();
  const [listings, setListings] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [hasMoreListings, setHasMoreListings] = useState(false);
  const [totalListings, setTotalListings] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [appliedFilters, setAppliedFilters] = useState<ListingFilters>({});
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const fetchData = useCallback(async (page = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (appliedFilters.keyword?.trim()) params.set('q', appliedFilters.keyword.trim());
      if (appliedFilters.category) params.set('category', appliedFilters.category);
      if (appliedFilters.condition) params.set('condition', appliedFilters.condition);
      if (appliedFilters.minPrice !== undefined) params.set('min', appliedFilters.minPrice.toString());
      if (appliedFilters.maxPrice !== undefined) params.set('max', appliedFilters.maxPrice.toString());
      params.set('page', page.toString());
      params.set('limit', pageSize.toString());
    
      // Add sort parameter - map to new sort options
      switch (sortBy) {
        case 'price-low':
          params.set('sort', 'low-to-high');
          break;
        case 'price-high':
          params.set('sort', 'high-to-low');
          break;
        case 'newest':
        default:
          params.set('sort', 'newest');
          break;
      }

      const { apiGet } = await import('@/lib/api-client');

      // Fetch listings and categories in parallel
      const [response, categoriesResponse] = await Promise.all([
        apiGet(`/api/listings?${params.toString()}`, { requireAuth: false }),
        apiGet('/api/categories', { requireAuth: false }),
      ]);

      const data = await response.json();
      if (response.ok) {
        const incoming = Array.isArray(data.data) ? data.data : [];
        setListings((current) => {
          if (!append) return incoming;
          const seen = new Set(current.map((listing) => listing.id));
          return [...current, ...incoming.filter((listing: SimpleListing) => !seen.has(listing.id))];
        });
        setHasMoreListings(Boolean(data.pagination?.hasMore));
        setTotalListings(data.pagination?.total || incoming.length);
        setNextPage(page + 1);
      } else {
        if (!append) setListings([]);
        setHasMoreListings(false);
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (!append) setListings([]);
      setHasMoreListings(false);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [appliedFilters, pageSize, sortBy]);

  useEffect(() => {
    void fetchData(1, false);
  }, [fetchData]);

  useEffect(() => {
    // Parse URL params for filters
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const keyword = searchParams.get('q');
    const minPrice = searchParams.get('min');
    const maxPrice = searchParams.get('max');

    const newFilters = {
      keyword: keyword || undefined,
      category: category || undefined,
      condition: condition || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    };

    
    setAppliedFilters(newFilters);
  }, [searchParams]);


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

  const SkeletonCard = () => (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-48 bg-dark-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-dark-700 rounded w-3/4" />
        <div className="h-3 bg-dark-700 rounded w-1/2" />
        <div className="h-5 bg-dark-700 rounded w-1/3" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950">

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
          <div className="w-full lg:w-80 shrink-0">
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
                Showing {listings.length} of {totalListings} listings
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
                <div className="flex items-center border border-dark-600 rounded-xl bg-dark-800 shrink-0">
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
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : listings.length > 0 ? (
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
                      sellerId: listing.sellerId,
                      sellerProfile: (listing as any).sellerProfile,
                      sold: (listing as any).sold,
                      soldThroughAllVerse: (listing as any).soldThroughAllVerse
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
                      sellerId: listing.sellerId,
                      sellerProfile: (listing as any).sellerProfile,
                      sold: (listing as any).sold,
                      soldThroughAllVerse: (listing as any).soldThroughAllVerse
                    }))}
                    view="list"
                  />
                )}

                {hasMoreListings ? (
                  <div className="mt-12 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void fetchData(nextPage, true)}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMore && <Loader2 className="h-5 w-5 animate-spin" />}
                      {loadingMore ? 'Loading listings…' : 'Load more AllVerse listings'}
                    </button>
                  </div>
                ) : (
                  <OtherMarketplacesFeed
                    key={JSON.stringify(appliedFilters)}
                    keyword={appliedFilters.keyword}
                    category={appliedFilters.category}
                    condition={appliedFilters.condition}
                    minPrice={appliedFilters.minPrice}
                    maxPrice={appliedFilters.maxPrice}
                    interestCategories={userProfile?.interestCategories}
                  />
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
                <OtherMarketplacesFeed
                  key={JSON.stringify(appliedFilters)}
                  keyword={appliedFilters.keyword}
                  category={appliedFilters.category}
                  condition={appliedFilters.condition}
                  minPrice={appliedFilters.minPrice}
                  maxPrice={appliedFilters.maxPrice}
                  interestCategories={userProfile?.interestCategories}
                />
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
