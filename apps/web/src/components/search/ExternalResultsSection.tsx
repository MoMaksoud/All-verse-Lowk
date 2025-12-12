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
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      className="group bg-white/5 backdrop-blur-lg border border-white/10 hover:border-accent-500/50 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent-500/10"
    >
      <div className="aspect-square bg-dark-900/50 overflow-hidden relative">
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
        <div className="absolute top-3 right-3">
          <span className="text-xs px-2 py-1 bg-black/60 backdrop-blur-sm text-white rounded-full border border-white/10">
            {result.source}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-accent-400 transition-colors">
          {result.title}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-accent-400 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {hasPrice ? result.price.toFixed(2) : 'N/A'}
          </span>

          {result.rating ? (
            <div className="flex items-center gap-1 text-xs text-gray-300">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>{result.rating.toFixed(1)}</span>
              {result.reviewsCount ? <span className="text-gray-400">({result.reviewsCount})</span> : null}
            </div>
          ) : (
            <div className="text-xs text-gray-500">No rating</div>
          )}
        </div>
      </div>
    </a>
  );
}

