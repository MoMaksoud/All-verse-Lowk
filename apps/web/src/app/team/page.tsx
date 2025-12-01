'use client';

import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

export default function TeamPage() {
  return (
    <div className="min-h-screen home-page">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link 
          href="/about"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-accent-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to About</span>
        </Link>

        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Our Team
          </h1>
          <p className="text-gray-400 text-lg">
            Meet the people building AllVerse GPT
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
          <p className="text-gray-300 mb-4">
            Full team directory coming soon.
          </p>
          <Link 
            href="/about"
            className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 transition-colors"
          >
            View Leadership Team
          </Link>
        </div>
      </div>
    </div>
  );
}

