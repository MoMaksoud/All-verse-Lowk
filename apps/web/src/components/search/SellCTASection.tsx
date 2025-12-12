'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, TrendingUp, Zap } from 'lucide-react';

export function SellCTASection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 backdrop-blur-xl border border-accent-500/30 shadow-2xl p-8 sm:p-12 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
          
          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 bg-accent-500/20 border border-accent-500/30 px-4 py-2 rounded-full mb-6">
              <Zap className="w-4 h-4 text-accent-400" />
              <span className="text-sm font-medium text-accent-400">
                Didn't find what you're looking for?
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Have Something to Sell?
            </h2>
            
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              List your items on All Verse GPT with AI-powered descriptions, smart pricing, and reach buyers instantly.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Start Selling Now
              </Link>
              
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200"
              >
                <TrendingUp className="w-5 h-5" />
                Browse Marketplace
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-accent-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">AI-Powered</h3>
                <p className="text-xs text-gray-400">Auto-generated listings</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-accent-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Smart Pricing</h3>
                <p className="text-xs text-gray-400">AI suggests fair prices</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6 text-accent-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Easy Setup</h3>
                <p className="text-xs text-gray-400">List in minutes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

