'use client';

import React, { useState } from 'react';
import { DollarSign, Star } from 'lucide-react';

interface ExternalResult {
  title: string;
  price: number;
  source: string;
  url: string;
  image?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
}

interface ExternalResultsSectionProps {
  results: ExternalResult[];
  loading?: boolean;
}

export function ExternalResultsSection({ results, loading }: ExternalResultsSectionProps) {
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
          {results.map((result, index) => {
            const hasPrice = typeof result.price === 'number' && !Number.isNaN(result.price) && result.price > 0;
            return <ProductCard key={`${result.url}-${index}`} result={result} hasPrice={hasPrice} />;
          })}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ result, hasPrice }: { result: ExternalResult; hasPrice: boolean }) {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(() => {
    // Use actual product image if available
    if (result.image && typeof result.image === 'string' && result.image.startsWith('http')) {
      return result.image;
    }
    return '/fallback-product.png';
  });

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white/5 backdrop-blur-lg border border-white/10 hover:border-accent-500/50 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent-500/10"
    >
      <div className="aspect-square sm:aspect-square bg-dark-900/50 overflow-hidden relative">
        <img
          src={imageSrc}
          alt={result.title}
          onError={(e) => {
            if (!imageError && imageSrc !== '/fallback-product.png') {
              setImageError(true);
              setImageSrc('/fallback-product.png');
            }
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3">
          <span className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/60 backdrop-blur-sm text-white rounded-full border border-white/10">
            {result.source}
          </span>
        </div>
      </div>

      <div className="p-2 sm:p-4 space-y-1 sm:space-y-2">
        <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 group-hover:text-accent-400 transition-colors">
          {result.title}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-sm sm:text-lg font-bold text-accent-400 flex items-center gap-0.5 sm:gap-1">
            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-base">{hasPrice ? result.price.toFixed(2) : 'N/A'}</span>
          </span>

          {result.rating ? (
            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-gray-300">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
              <span>{result.rating.toFixed(1)}</span>
              {result.reviewsCount && result.reviewsCount < 100000 ? (
                <span className="text-gray-400 hidden sm:inline">({result.reviewsCount})</span>
              ) : null}
            </div>
          ) : (
            <div className="text-[10px] sm:text-xs text-gray-500">No rating</div>
          )}
        </div>
      </div>
    </a>
  );
}

