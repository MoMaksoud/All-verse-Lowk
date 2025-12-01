'use client';

import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DiscoverPage() {
  return (
    <div className="min-h-screen home-page">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-accent-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Smart Discovery
          </h1>
          <p className="text-gray-400 text-lg">
            Find exactly what you need
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
          <p className="text-gray-300 mb-6 text-lg">
            Discover personalized recommendations tailored to your preferences and search history.
          </p>
          <p className="text-gray-400 mb-6">
            This feature is coming soon. Explore our listings to find what you're looking for.
          </p>
          <Link 
            href="/listings"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-accent-500/20 hover:shadow-xl hover:shadow-accent-500/30 hover:scale-105 active:scale-95 text-lg"
          >
            <ShoppingBag className="w-5 h-5" />
            Explore Listings
          </Link>
        </div>
      </div>
    </div>
  );
}

