'use client';

import React from 'react';
import { Navigation } from '@/components/Navigation';
import { Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OffersPage() {
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
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Instant Offers
          </h1>
          <p className="text-gray-400 text-lg">
            Make offers with AI assistance
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
          <p className="text-gray-300 mb-6 text-lg">
            Get AI-powered suggestions for making competitive offers on listings.
          </p>
          <p className="text-gray-400 mb-6">
            This feature is coming soon. Browse our marketplace to find items you're interested in.
          </p>
          <Link 
            href="/listings"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-accent-500/20 hover:shadow-xl hover:shadow-accent-500/30 hover:scale-105 active:scale-95 text-lg"
          >
            <Zap className="w-5 h-5" />
            Browse Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

