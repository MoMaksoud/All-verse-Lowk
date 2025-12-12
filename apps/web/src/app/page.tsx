'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Star, Clock, MessageCircle, ShoppingBag, Zap, Brain, Bot, Sparkles, ArrowRight } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
// Import Navigation directly - it's used on every page so lazy loading doesn't help
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SkeletonCard, SkeletonSearchBar, SkeletonAIWidget } from '@/components/SkeletonLoader';
import { ResourcePreloader } from '@/components/ResourcePreloader';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useOptimizedFetch } from '@/hooks/useOptimizedFetch';

// Optimized imports - use dynamic imports for heavy components
import ListingCard from '@/components/ListingCard';
import { AIWidget } from '@/components/AIWidget';
import { DynamicBackground } from '@/components/DynamicBackground';
import { UniversalSearchHero } from '@/components/search/UniversalSearchHero';

export default function HomePage() {
  const isHomeRoute = useRouteGuard();
  const router = useRouter();

  const fetchFeaturedListings = useCallback(async () => {
    try {
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/listings?limit=4', { 
        requireAuth: false,
        headers: {
          'Cache-Control': 'max-age=15',
        },
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch listings: ${response.status} ${response.statusText}`);
        // If it's a 401, that's expected for non-authenticated users browsing public listings
        if (response.status === 401) {
          console.log('User not authenticated, but that should be OK for public listings');
        }
        return []; // Return empty array for any error
      }
      
      const data = await response.json();
      
      // Ensure we always return an array
      return Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      console.error('Error fetching featured listings:', error);
      return []; // Return empty array on error
    }
  }, []);

  const { 
    data: featuredListings = [], 
    loading, 
    error 
  } = useOptimizedFetch<SimpleListing[]>(
    'featured-listings', 
    fetchFeaturedListings,
    { ttl: 15000 } // 15 seconds cache
  );

  // Show skeleton loading instead of spinner for better perceived performance
  if (loading) {
    return (
      <div className="min-h-screen home-page">
        <Navigation />
        <div className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-20 bg-gray-700 rounded-lg mb-6 mx-auto max-w-2xl"></div>
                <div className="h-8 bg-gray-700 rounded-lg mb-8 mx-auto max-w-lg"></div>
                <div className="h-12 bg-gray-700 rounded-lg mb-8 mx-auto max-w-md"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen home-page">
      <ResourcePreloader />
      
      {/* Sitewide Dynamic Background - Only on home route */}
      {isHomeRoute && (
        <Suspense fallback={<div className="fixed inset-0 bg-dark-950" />}>
          <DynamicBackground intensity="low" showParticles={true} />
        </Suspense>
      )}
      
      <Navigation />
      
      {/* Universal Search Hero Section */}
      <UniversalSearchHero />

      {/* AI Action Cards */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-4">
              AI-Powered Features
            </h2>
            <p className="text-base sm:text-lg text-gray-400 px-4">
              Experience the future of marketplace interactions
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <button
              onClick={() => router.push('/chat')}
              className="card hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-dark-900"
            >
              <div className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:glow transition-all duration-200 group-active:scale-90">
                  <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Smart Chat</h3>
                <p className="text-gray-400 text-xs sm:text-sm px-2">AI-powered conversations with sellers</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/offers')}
              className="card hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-dark-900"
            >
              <div className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:glow transition-all duration-200 group-active:scale-90">
                  <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Instant Offers</h3>
                <p className="text-gray-400 text-xs sm:text-sm px-2">Make offers with AI assistance</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/pricing')}
              className="card hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-dark-900"
            >
              <div className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:glow transition-all duration-200 group-active:scale-90">
                  <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Smart Pricing</h3>
                <p className="text-gray-400 text-xs sm:text-sm px-2">AI-suggested fair prices</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/discover')}
              className="card hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-dark-900"
            >
              <div className="p-4 sm:p-6 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:glow transition-all duration-200 group-active:scale-90">
                  <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Smart Discovery</h3>
                <p className="text-gray-400 text-xs sm:text-sm px-2">Find exactly what you need</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* AI Command Center Widget */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4" style={{textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'}}>
              AI Command Center
            </h2>
            <p className="text-lg text-white" style={{textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'}}>
              Access powerful AI tools and analytics
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <Suspense fallback={<SkeletonAIWidget />}>
              <AIWidget />
            </Suspense>
          </div>
        </div>
      </section>


      {/* Featured Listings */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
                Featured Listings
              </h2>
              <p className="text-base sm:text-lg text-gray-400">
                AI-recommended items for you
              </p>
            </div>
            <Link
              href="/listings"
              className="btn btn-primary flex items-center gap-2 text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3"
            >
              View All
              <TrendingUp className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            {featuredListings && featuredListings.length > 0 ? (
              featuredListings.map((listing) => (
                <Suspense key={listing.id} fallback={<SkeletonCard />}>
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
                    sold={(listing as any).sold}
                  />
                </Suspense>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-400">No featured listings available</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 text-center">

      {/* Card */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 sm:p-5">
        <h3 className="text-xl sm:text-2xl font-semibold text-accent-400 mb-1">
          AI-Driven Platform
        </h3>
        <p className="text-sm sm:text-base text-gray-300">
          Smart recommendations and pricing powered by advanced AI
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 sm:p-5">
        <h3 className="text-xl sm:text-2xl font-semibold text-accent-400 mb-1">
          Growing Community
        </h3>
        <p className="text-sm sm:text-base text-gray-300">
          Early users and sellers are joining every day
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 sm:p-5 sm:col-span-2 md:col-span-1">
        <h3 className="text-xl sm:text-2xl font-semibold text-accent-400 mb-1">
          Secure & Verified
        </h3>
        <p className="text-sm sm:text-base text-gray-300">
          Stripe-powered payments and listing verification
        </p>
      </div>

    </div>
  </div>
</section>


      {/* CTA Section */}
     {/* CTA Section */}
<section className="py-12 sm:py-16 md:py-20">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">

    <div className="relative rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-xl p-6 sm:p-8 md:p-12">

      {/* Accent Line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-accent-500 rounded-full" />

      {/* Logo */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center gap-2 bg-white/10 px-4 py-1 rounded-full border border-white/20">
          <Logo size="sm" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 break-words">
        Ready to Start Selling?
      </h2>

      {/* Subtitle */}
      <p className="text-gray-400 text-base sm:text-lg mb-6 sm:mb-8 px-2">
        Turn your items into earnings with AI-assisted listing and pricing.
      </p>

      {/* CTA Button */}
      <Link
        href="/sell"
        className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 transition-all px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-medium shadow-lg shadow-accent-500/20"
      >
        Start Selling
        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </Link>

    </div>
  </div>
</section>


      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-sm py-8 sm:py-12 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Section */}
            <div>
              <h3 className="text-white font-semibold mb-4">Contact Us</h3>
              <a 
                href="mailto:info@allversegpt.com" 
                className="text-gray-400 hover:text-accent-400 transition-colors inline-flex items-center gap-2"
              >
                <span>info@allversegpt.com</span>
              </a>
            </div>

            {/* Links Section */}
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-accent-400 transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-400 hover:text-accent-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-400 hover:text-accent-400 transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Additional Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-gray-400 hover:text-accent-400 transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-gray-400 hover:text-accent-400 transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-accent-400 transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-800/50 text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} All Verse GPT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}