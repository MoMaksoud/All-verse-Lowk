'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Star, Clock } from 'lucide-react';
import { mockApi } from '@marketplace/lib';
import { Listing, Category } from '@marketplace/types';
import { ListingCard } from '@/components/ListingCard';
import { CategoryCard } from '@/components/CategoryCard';
import { SearchBar } from '@/components/SearchBar';

export default function HomePage() {
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsResponse, categoriesResponse] = await Promise.all([
          mockApi.getListings({}, 1, 8),
          mockApi.getCategories(),
        ]);

        setFeaturedListings(listingsResponse.data);
        setCategories(categoriesResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Buy and Sell Everything
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              The modern marketplace for local and global commerce
            </p>
            <SearchBar className="max-w-2xl mx-auto" />
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Browse Categories
            </h2>
            <p className="text-lg text-gray-600">
              Find what you're looking for in our curated categories
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Featured Listings
              </h2>
              <p className="text-lg text-gray-600">
                Discover amazing items from our community
              </p>
            </div>
            <Link
              href="/listings"
              className="btn btn-primary flex items-center gap-2"
            >
              View All
              <TrendingUp className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">
                10K+
              </div>
              <div className="text-lg text-gray-600">Active Listings</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">
                50K+
              </div>
              <div className="text-lg text-gray-600">Happy Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">
                99%
              </div>
              <div className="text-lg text-gray-600">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Selling?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join thousands of sellers and start earning today
          </p>
          <Link
            href="/sell"
            className="btn bg-white text-primary-600 hover:bg-gray-100 inline-flex items-center gap-2"
          >
            Start Selling
            <Star className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
