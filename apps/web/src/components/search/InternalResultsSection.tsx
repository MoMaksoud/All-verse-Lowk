'use client';

import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';

interface InternalResult {
  id: string;
  title: string;
  price: number;
  description: string;
  photos: string[];
  category: string;
  condition: string;
  sellerId: string;
  isMatched?: boolean;
}

interface InternalResultsSectionProps {
  results: InternalResult[];
  loading?: boolean;
}

export function InternalResultsSection({ results, loading }: InternalResultsSectionProps) {
  if (loading) {
    return null;
  }

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <section className="py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {results.map((result) => {
            const primaryPhoto = result.photos?.[0];
            const validImage = primaryPhoto && primaryPhoto.startsWith('http') ? primaryPhoto : '/fallback-product.png';
            return (
              <Link
                key={result.id}
                href={`/listings/${result.id}`}
                className={`group bg-white/5 backdrop-blur-lg rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                  result.isMatched
                    ? 'border-2 border-yellow-500/50 shadow-xl shadow-yellow-500/20 hover:border-yellow-500/70'
                    : 'border border-white/10 hover:border-accent-500/50 hover:shadow-xl hover:shadow-accent-500/10'
                }`}
              >
                <div className="aspect-square bg-dark-900/50 overflow-hidden relative">
                  <Image
                    src={validImage}
                    alt={result.title}
                    fill
                    unoptimized
                    className="object-cover w-full h-full rounded-xl transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 flex flex-col gap-1 sm:gap-2">
                    {result.isMatched && (
                      <span className="text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-yellow-500/90 text-black font-bold rounded-full border border-yellow-400 shadow-lg animate-pulse">
                        ⭐ BEST MATCH
                      </span>
                    )}
                    <span className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-green-500/20 text-green-200 rounded-full border border-green-500/30">
                      AVGPT
                    </span>
                  </div>
                </div>
                
                <div className="p-2 sm:p-4 space-y-1 sm:space-y-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 group-hover:text-accent-400 transition-colors">
                    {result.title}
                  </h3>
                  
                  <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-2 hidden sm:block">
                    {result.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-lg font-bold text-accent-400">
                      ${result.price.toFixed(2)}
                    </span>
                      {result.isMatched && (
                        <span className="text-[9px] sm:text-xs text-yellow-400 font-medium">
                          Competitive Price
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button className="p-1 sm:p-1.5 hover:bg-white/5 rounded-lg transition-colors" aria-label="Favorite">
                        <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hover:text-red-400" />
                      </button>
                      <button className="p-1 sm:p-1.5 hover:bg-white/5 rounded-lg transition-colors" aria-label="Message seller">
                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hover:text-accent-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

