'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Heart, Search, AlertCircle } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import ListingCard from '@/components/ListingCard';
import { loadFavoriteIds, setFavorite } from '@/lib/favorites';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES } from '@/lib/categories';

export default function FavoritesPage() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Load favorites once the signed-in user is known (the token isn't ready on first render)
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const loadFavorites = async () => {
      setLoading(true);
      setError(null);
      try {
        const favoriteIds = [...(await loadFavoriteIds())];
        if (favoriteIds.length === 0) {
          setFavorites([]);
          setLoading(false);
          return;
        }

        // Fetch details for each favorite listing
        const { apiGet } = await import('@/lib/api-client');
        const favoriteListings = await Promise.all(
          favoriteIds.map(async (id: string) => {
            try {
              const response = await apiGet(`/api/listings/${id}`, { requireAuth: false });
              if (response.ok) {
                return await response.json();
              }
              return null;
            } catch (error) {
              console.error(`Error fetching listing ${id}:`, error);
              return null;
            }
          })
        );

        // Filter out null values (deleted listings)
        const validFavorites = favoriteListings.filter(listing => listing !== null);
        setFavorites(validFavorites);
      } catch (error) {
        console.error('Error loading favorites:', error);
        setError('We couldn’t load your favorites. Try again in a moment.');
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [currentUser]);

  // Filter favorites based on search and category
  const filteredFavorites = favorites.filter(listing => {
    const matchesSearch = !searchQuery ||
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || listing.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const removeFavorite = useCallback(async (listingId: string) => {
    try {
      await setFavorite(listingId, false);
      setFavorites(prev => prev.filter(listing => listing.id !== listingId));
    } catch (error) {
      console.error('Error removing favorite:', error);
      setError('Couldn’t remove that item. Try again.');
    }
  }, []);

  const hasFilters = Boolean(searchQuery || selectedCategory);

  return (
    <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Saved items</h1>
        {!loading && (
          <p className="mt-2 text-zinc-600">
            {favorites.length === 0
              ? 'Tap the heart on anything you want to come back to.'
              : `${favorites.length} saved ${favorites.length === 1 ? 'item' : 'items'}`}
          </p>
        )}
      </header>

      {error && (
        <p role="alert" className="mt-6 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {loading ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading saved items">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square animate-pulse rounded-xl bg-zinc-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="mt-10 flex flex-col items-start rounded-2xl border border-dashed border-zinc-300 p-8 sm:p-10">
          <Heart strokeWidth={1.5} className="h-8 w-8 text-zinc-500" />
          <h2 className="mt-4 font-semibold text-zinc-950">Nothing saved yet</h2>
          <p className="mt-1 max-w-[44ch] text-sm text-zinc-600">
            Saved items stay here so you can compare them later.
          </p>
          <Link href="/listings" className="btn btn-primary mt-6">Browse listings</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search saved items</span>
              <Search strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved items"
                className="input pl-9"
              />
            </label>
            <label className="sm:w-56">
              <span className="sr-only">Filter by category</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>

          {filteredFavorites.length === 0 ? (
            <div className="mt-10 flex flex-col items-start">
              <h2 className="font-semibold text-zinc-950">No saved items match</h2>
              <p className="mt-1 text-sm text-zinc-600">Try a different search or category.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                }}
                className="btn btn-outline mt-4"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {hasFilters && (
                <p className="mt-6 text-sm text-zinc-500">
                  Showing {filteredFavorites.length} of {favorites.length}
                </p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredFavorites.map((listing) => (
                  <div key={listing.id} className="relative">
                    <ListingCard
                      variant="grid"
                      id={listing.id}
                      title={listing.title}
                      description={listing.description}
                      price={listing.price}
                      category={listing.category}
                      condition={listing.condition}
                      imageUrl={listing.photos?.[0] || null}
                      sellerId={listing.sellerId}
                    />
                    <button
                      type="button"
                      onClick={() => removeFavorite(listing.id)}
                      aria-label={`Remove ${listing.title} from saved items`}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-primary-700 shadow-sm transition hover:bg-white"
                    >
                      <Heart strokeWidth={1.75} className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
