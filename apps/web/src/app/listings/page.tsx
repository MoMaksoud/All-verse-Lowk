'use client';

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LayoutGrid, List, SlidersHorizontal, X, SearchX } from 'lucide-react';
import { SimpleListing, ListingFilters } from '@marketplace/types';
import { ListingCardSkeleton } from '@/components/ListingCard';
import { ListingFilters as ListingFiltersComponent } from '@/components/ListingFilters';
import { categoryLabel } from '@/lib/categories';
import Select from '@/components/Select';
import ListingCollection from '@/components/ListingCollection';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStartChatFromListing } from '@/lib/messaging';
import { OtherMarketplacesFeed } from '@/components/OtherMarketplacesFeed';

function ListingsContent() {
  const pageSize = 24;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();
  const [listings, setListings] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPage, setNextPage] = useState(2);
  const [hasMoreListings, setHasMoreListings] = useState(false);
  const [totalListings, setTotalListings] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  // Filters arrive from the URL after mount, so an older unfiltered request can resolve last; drop stale responses
  const requestIdRef = useRef(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [appliedFilters, setAppliedFilters] = useState<ListingFilters>({});
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const fetchData = useCallback(async (page = 1, append = false) => {
    if (append && loadingMoreRef.current) return;
    const requestId = ++requestIdRef.current;
    try {
      if (append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }
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

      const response = await apiGet(`/api/listings?${params.toString()}`, { requireAuth: false });

      const data = await response.json();
      if (requestId !== requestIdRef.current) return;
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
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (requestId !== requestIdRef.current) return;
      if (!append) setListings([]);
      setHasMoreListings(false);
    } finally {
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
      else if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [appliedFilters, pageSize, sortBy]);

  useEffect(() => {
    void fetchData(1, false);
  }, [fetchData]);

  const loadMoreListings = useCallback(() => {
    if (!hasMoreListings || loadingMoreRef.current) return;
    void fetchData(nextPage, true);
  }, [fetchData, hasMoreListings, nextPage]);

  useEffect(() => {
    if (!hasMoreListings) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreListings();
      },
      { rootMargin: '1200px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreListings, loadMoreListings]);

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

  // Keep the URL in sync so filtered views can be shared and survive reloads
  const applyFilters = useCallback((next: ListingFilters) => {
    const params = new URLSearchParams();
    if (next.keyword?.trim()) params.set('q', next.keyword.trim());
    if (next.category) params.set('category', next.category);
    if (next.condition) params.set('condition', next.condition);
    if (next.minPrice !== undefined) params.set('min', String(next.minPrice));
    if (next.maxPrice !== undefined) params.set('max', String(next.maxPrice));
    const qs = params.toString();
    router.replace(qs ? `/listings?${qs}` : '/listings', { scroll: false });
    setShowFilters(false);
  }, [router]);

  const chips = [
    appliedFilters.keyword && { key: 'keyword', label: `“${appliedFilters.keyword}”` },
    appliedFilters.category && { key: 'category', label: categoryLabel(appliedFilters.category) },
    appliedFilters.condition && { key: 'condition', label: appliedFilters.condition.replace('-', ' ') },
    (appliedFilters.minPrice !== undefined || appliedFilters.maxPrice !== undefined) && {
      key: 'price',
      label: `$${appliedFilters.minPrice ?? 0} to ${appliedFilters.maxPrice !== undefined ? `$${appliedFilters.maxPrice}` : 'any'}`,
    },
  ].filter(Boolean) as { key: string; label: string }[];

  const removeChip = (key: string) => {
    const next = { ...appliedFilters };
    if (key === 'price') {
      delete next.minPrice;
      delete next.maxPrice;
    } else {
      delete next[key as keyof ListingFilters];
    }
    applyFilters(next);
  };

  const heading = appliedFilters.category ? categoryLabel(appliedFilters.category) : 'Marketplace';
  const items = listings.map((listing) => ({
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
    soldThroughAllVerse: (listing as any).soldThroughAllVerse,
  }));
  const externalFeed = (
    <OtherMarketplacesFeed
      key={JSON.stringify(appliedFilters)}
      keyword={appliedFilters.keyword}
      category={appliedFilters.category}
      condition={appliedFilters.condition}
      minPrice={appliedFilters.minPrice}
      maxPrice={appliedFilters.maxPrice}
      interestCategories={userProfile?.interestCategories}
    />
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:px-8">
        <header className="mb-8 flex flex-col gap-1 md:mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{heading}</h1>
          <p className="text-sm text-zinc-500">
            {loading ? 'Loading items…' : `${totalListings.toLocaleString('en-US')} ${totalListings === 1 ? 'item' : 'items'} on AllVerse`}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
          <div className={clsx(showFilters ? 'block' : 'hidden', 'lg:block')}>
            <div>
              <ListingFiltersComponent filters={appliedFilters} onFiltersChange={applyFilters} />
            </div>
          </div>

          <div className="min-w-0">
            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-4">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className="btn btn-outline gap-2 py-2 lg:hidden"
              >
                <SlidersHorizontal strokeWidth={1.75} className="h-4 w-4" />
                Filters{chips.length ? ` (${chips.length})` : ''}
              </button>

              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {chips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => removeChip(chip.key)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-1.5 pl-3 pr-2 text-sm capitalize text-zinc-800 transition hover:bg-zinc-200"
                      aria-label={`Remove filter ${chip.label}`}
                    >
                      {chip.label}
                      <X strokeWidth={2} className="h-3.5 w-3.5 text-zinc-500" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => applyFilters({})}
                    className="px-1 text-sm font-medium text-primary-700 hover:text-primary-800"
                  >
                    Clear all
                  </button>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Select
                  value={sortBy}
                  onChange={(value) => setSortBy(value as typeof sortBy)}
                  options={[
                    { value: 'newest', label: 'Newest first' },
                    { value: 'price-low', label: 'Price: low to high' },
                    { value: 'price-high', label: 'Price: high to low' },
                  ]}
                  placeholder="Sort by"
                  className="w-[180px]"
                />
                <div className="hidden items-center rounded-lg border border-zinc-300 p-0.5 sm:flex" role="group" aria-label="Layout">
                  {([['grid', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      aria-pressed={viewMode === mode}
                      aria-label={`${mode} view`}
                      className={clsx(
                        'grid h-9 w-9 place-items-center rounded-md transition',
                        viewMode === mode ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                      )}
                    >
                      <Icon strokeWidth={1.75} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-6">
                {Array.from({ length: 9 }).map((_, i) => <ListingCardSkeleton key={i} />)}
              </div>
            ) : listings.length > 0 ? (
              <>
                <ListingCollection items={items} view={viewMode} />

                {hasMoreListings ? (
                  <div ref={loadMoreSentinelRef} className="mt-8" aria-live="polite">
                    {loadingMore && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:gap-x-6">
                        {Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={`more-${i}`} />)}
                      </div>
                    )}
                    {!loadingMore && <div className="h-24" />}
                  </div>
                ) : (
                  externalFeed
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-zinc-300 px-6 py-10">
                  <SearchX strokeWidth={1.5} className="h-8 w-8 text-zinc-400" />
                  <div>
                    <p className="font-medium text-zinc-950">No items match these filters</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Try removing a filter, or check what&apos;s listed elsewhere below.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {chips.length > 0 && (
                      <button type="button" onClick={() => applyFilters({})} className="btn btn-outline py-2">
                        Clear filters
                      </button>
                    )}
                    <Link href="/sell" className="btn btn-primary py-2">
                      Sell one like it
                    </Link>
                  </div>
                </div>
                {externalFeed}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:px-8">
      <div className="mb-10 h-9 w-48 animate-pulse rounded bg-zinc-100" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<ListingsLoading />}>
      <ListingsContent />
    </Suspense>
  );
}
