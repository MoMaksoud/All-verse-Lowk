'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Star, Clock, MessageCircle, ShoppingBag, Zap, Brain } from 'lucide-react';
import { mockApi } from '@marketplace/lib';
import { Listing, Category } from '@marketplace/types';
import { ListingCard } from '@/components/ListingCard';
import { CategoryCard } from '@/components/CategoryCard';
import { SearchBar } from '@/components/SearchBar';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';

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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="mb-8">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient">
                Hi, Welcome to ALLVERSE GPT
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
                Your intelligent marketplace assistant. Buy, sell, and discover with AI-powered insights.
              </p>
            </div>
            <SearchBar className="max-w-2xl mx-auto" />
          </div>
        </div>
      </section>

      {/* AI Action Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              AI-Powered Features
            </h2>
            <p className="text-lg text-gray-400">
              Experience the future of marketplace interactions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card hover:scale-105 transition-transform duration-200 cursor-pointer group">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4 group-hover:glow">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Chat</h3>
                <p className="text-gray-400 text-sm">AI-powered conversations with sellers</p>
              </div>
            </div>
            
            <div className="card hover:scale-105 transition-transform duration-200 cursor-pointer group">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4 group-hover:glow">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Instant Offers</h3>
                <p className="text-gray-400 text-sm">Make offers with AI assistance</p>
              </div>
            </div>
            
            <div className="card hover:scale-105 transition-transform duration-200 cursor-pointer group">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4 group-hover:glow">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Pricing</h3>
                <p className="text-gray-400 text-sm">AI-suggested fair prices</p>
              </div>
            </div>
            
            <div className="card hover:scale-105 transition-transform duration-200 cursor-pointer group">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4 group-hover:glow">
                  <ShoppingBag className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Discovery</h3>
                <p className="text-gray-400 text-sm">Find exactly what you need</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Browse Categories
            </h2>
            <p className="text-lg text-gray-400">
              Explore our AI-curated categories
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Featured Listings
              </h2>
              <p className="text-lg text-gray-400">
                AI-recommended items for you
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
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="card">
              <div className="p-6">
                <div className="text-4xl font-bold text-accent-400 mb-2">
                  10K+
                </div>
                <div className="text-lg text-gray-300">Active Listings</div>
              </div>
            </div>
            <div className="card">
              <div className="p-6">
                <div className="text-4xl font-bold text-accent-400 mb-2">
                  50K+
                </div>
                <div className="text-lg text-gray-300">Happy Users</div>
              </div>
            </div>
            <div className="card">
              <div className="p-6">
                <div className="text-4xl font-bold text-accent-400 mb-2">
                  99%
                </div>
                <div className="text-lg text-gray-300">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card-elevated p-12">
            <div className="flex justify-center mb-6">
              <Logo size="md" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Selling?
            </h2>
            <p className="text-xl mb-8 text-gray-300">
              Join thousands of sellers and start earning with AI assistance
            </p>
            <Link
              href="/sell"
              className="btn btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
            >
              Start Selling
              <Star className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
