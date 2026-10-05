'use client';

import React from 'react';
import ListingCard from '@/components/ListingCard';

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
  if (loading || !results || results.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {results.map((result, i) => (
        <div key={result.id} className="reveal relative" style={{ '--i': i } as React.CSSProperties}>
          {result.isMatched && (
            <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 rounded-md bg-primary-600 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
              Best match
            </span>
          )}
          <ListingCard
            variant="grid"
            id={result.id}
            title={result.title}
            description={result.description}
            price={result.price}
            category={result.category}
            condition={result.condition}
            imageUrl={result.photos?.[0] || null}
            sellerId={result.sellerId}
          />
        </div>
      ))}
    </div>
  );
}
