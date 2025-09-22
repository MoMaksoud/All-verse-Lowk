'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  skeleton?: boolean;
  overlay?: boolean;
}

export function PageLoader({ 
  message = "Loading...", 
  skeleton = false, 
  overlay = true 
}: PageLoaderProps) {
  if (skeleton) {
    return (
      <div className="min-h-screen bg-dark-950">
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              {/* Header skeleton */}
              <div className="h-8 bg-gray-700 rounded-lg w-1/3"></div>
              
              {/* Content skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-gray-700 rounded-lg h-64"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-dark-800 rounded-lg p-6 flex items-center space-x-3 shadow-xl border border-dark-600">
          <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
          <span className="text-white font-medium">{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-accent-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-lg">{message}</p>
      </div>
    </div>
  );
}
