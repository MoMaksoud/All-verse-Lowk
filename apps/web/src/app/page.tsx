'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Star, Clock, MessageCircle, ShoppingBag, Zap, Brain, Bot, Sparkles, ArrowRight } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { ListingCard } from '@/components/ListingCard';
import { CategoryCard } from '@/components/CategoryCard';
import { SearchBar } from '@/components/SearchBar';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AIWidget } from '@/components/AIWidget';
import { DynamicBackground } from '@/components/DynamicBackground';
import { useRouteGuard } from '@/hooks/useRouteGuard';

export default function HomePage() {
  const [featuredListings, setFeaturedListings] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const isHomeRoute = useRouteGuard();

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/listings?limit=8');
      const data = await response.json();

      if (response.ok) {
        setFeaturedListings(data.data || []);
      } else {
        setFeaturedListings([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setFeaturedListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navigation />
        <LoadingSpinner size="lg" text="Loading featured listings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen home-page">
      {/* Sitewide Dynamic Background - Only on home route */}
      {isHomeRoute && <DynamicBackground intensity="low" showParticles={true} />}
      
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-accent-500/10 border border-accent-500/20 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
                <Bot className="w-5 h-5 text-accent-400" />
                <span className="text-accent-400 font-medium">Powered by Advanced AI</span>
                <Sparkles className="w-4 h-4 text-accent-400 animate-pulse" />
              </div>
              
<<<<<<< HEAD
              <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient">
                Hi, Welcome to ALL VERSE GPT
=======
              <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient drop-shadow-lg">
                Hi, Welcome to ALLVERSE GPT
>>>>>>> 644529cb70fcef73d7048957d7514b68656cb92a
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto drop-shadow-md">
                Your intelligent marketplace assistant. Ask our AI anything and get instant, smart responses that guide you to exactly what you need.
              </p>
            </div>
            <div className="relative">
              <SearchBar className="max-w-2xl mx-auto drop-shadow-lg" />
            </div>
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

      {/* AI Command Center Widget */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              AI Command Center
            </h2>
            <p className="text-lg text-gray-400">
              Access powerful AI tools and analytics
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <AIWidget />
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <CategoryCard category={{ id: 'electronics', name: 'Electronics', slug: 'electronics', icon: 'electronics.svg', iconImage: '/icons/electronics.svg' }} />
            <CategoryCard category={{ id: 'fashion', name: 'Fashion', slug: 'fashion', icon: 'fashion.svg', iconImage: '/icons/fashion.svg' }} />
            <CategoryCard category={{ id: 'home', name: 'Home', slug: 'home', icon: 'home.svg', iconImage: '/icons/home.svg' }} />
            <CategoryCard category={{ id: 'sports', name: 'Sports', slug: 'sports', icon: 'sports.svg', iconImage: '/icons/sports.svg' }} />
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
