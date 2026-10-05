'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ImageOff, Star } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { recordDiscoveryClick } from '@/lib/discoveryHistory';

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
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {results.map((result, index) => {
        const hasPrice = typeof result.price === 'number' && !Number.isNaN(result.price) && result.price > 0;
        return <ProductCard key={`${result.url}-${index}`} result={result} hasPrice={hasPrice} />;
      })}
    </div>
  );
}

function ProductCard({ result, hasPrice }: { result: ExternalResult; hasPrice: boolean }) {
  const hasImage = typeof result.image === 'string' && result.image.startsWith('http');
  const [failed, setFailed] = useState(false);

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => recordDiscoveryClick({ query: result.title, source: result.source })}
      className="group flex h-full flex-col rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-4"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-zinc-100">
        {hasImage && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.image!}
            alt={result.title}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-zinc-300">
            <ImageOff strokeWidth={1.25} className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-zinc-800 shadow-sm backdrop-blur">
          {result.source}
        </span>
        <span className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-zinc-700 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
          <ArrowUpRight strokeWidth={1.75} className="h-4 w-4" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-800 transition-colors group-hover:text-zinc-950">
          {result.title}
        </h3>
        {result.rating ? (
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <Star strokeWidth={0} className="h-3.5 w-3.5 fill-amber-400" />
            {result.rating.toFixed(1)}
            {result.reviewsCount && result.reviewsCount < 100000 ? ` (${result.reviewsCount})` : ''}
          </p>
        ) : null}
        <p className="mt-auto pt-1 text-base font-semibold tabular-nums text-zinc-950">
          {hasPrice ? formatPrice(result.price) : <span className="text-sm font-medium text-zinc-500">See price</span>}
        </p>
      </div>
    </a>
  );
}
