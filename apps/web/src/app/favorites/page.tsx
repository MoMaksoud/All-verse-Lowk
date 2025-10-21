'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Heart, Search, Filter } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import ListingCard from '@/components/ListingCard';
import { Navigation } from '@/components/Navigation';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Get favorites from localStorage
  const getFavorites = useCallback(() => {
    try {
      const stored = localStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }, []);

  // Load favorites on component mount
  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      try {
        const favoriteIds = getFavorites();
        if (favoriteIds.length === 0) {
          setFavorites([]);
          setLoading(false);
          return;
        }

        // Fetch details for each favorite listing
        const favoriteListings = await Promise.all(
          favoriteIds.map(async (id: string) => {
            try {
              const response = await fetch(`/api/listings/${id}`);
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
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [getFavorites]);

  // Filter favorites based on search and category
  const filteredFavorites = favorites.filter(listing => {
    const matchesSearch = !searchQuery || 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || listing.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const removeFavorite = useCallback((listingId: string) => {
    try {
      const currentFavorites = getFavorites();
      const updatedFavorites = currentFavorites.filter((id: string) => id !== listingId);
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      
      // Update local state
      setFavorites(prev => prev.filter(listing => listing.id !== listingId));
      
      // Show toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 bg-red-500 text-white';
      toast.textContent = 'Removed from favorites';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 3000);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }, [getFavorites]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navigation />
        <LoadingSpinner size="lg" text="Loading your favorites..." />
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
            <Heart className="w-8 h-8 text-accent-500 fill-current" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">
            My Favorites
          </h1>
          <p className="text-lg text-gray-400">
            {favorites.length === 0 
              ? "You haven't favorited any items yet" 
              : `${favorites.length} favorite${favorites.length === 1 ? '' : 's'} saved`
            }
          </p>
        </div>
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No Favorites Yet</h2>
            <p className="text-gray-400 mb-6">
              Start exploring and click the heart icon on items you like to add them here.
            </p>
            <a
              href="/listings"
              className="btn btn-primary"
            >
              Browse Listings
            </a>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-8">
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search favorites..."
                        className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      />
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="md:w-48">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
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
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="mb-6">
              <p className="text-gray-400">
                {filteredFavorites.length} of {favorites.length} favorites
                {(searchQuery || selectedCategory) && ' match your filters'}
              </p>
            </div>

            {/* Favorites Grid */}
            {filteredFavorites.length === 0 ? (
              <div className="text-center py-16">
                <Filter className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-white mb-2">No Matches</h2>
                <p className="text-gray-400 mb-6">
                  Try adjusting your search or filter criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  className="btn btn-outline"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredFavorites.map((listing) => (
                  <div key={listing.id} className="relative group">
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
                      onClick={() => removeFavorite(listing.id)}
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                      title="Remove from favorites"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
