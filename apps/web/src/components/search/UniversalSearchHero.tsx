'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Camera, ArrowRight } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { normalizeImageSrc } from '@marketplace/shared-logic';
import { ImageSearchModal } from '@/components/search/ImageSearchModal';
import { getPopularSearches } from '@/lib/searchAnalytics';
import { formatPrice } from '@/lib/format';

const POPULAR_LIMIT = 4;

// Collage tile shapes: one tall tile on the left, two stacked on the right.
const TILE_CLASSES = [
  'row-span-2',
  'aspect-square',
  'aspect-square',
];

export function UniversalSearchHero({ listings = [] }: { listings?: SimpleListing[] }) {
  const [query, setQuery] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const router = useRouter();
  const popularSearches = useMemo(() => getPopularSearches(POPULAR_LIMIT).map((q) => q.query), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const tiles = listings.filter((l) => normalizeImageSrc(l.photos?.[0] || '')).slice(0, 3);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return;
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?query=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="relative">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8 lg:pb-24">
        <div className="reveal max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-600" />
            AI-priced secondhand marketplace
          </p>

          <h1 className="text-4xl font-semibold leading-[1.02] tracking-tighter text-zinc-950 md:text-6xl">
            Good stuff,
            <br />
            <span className="text-primary-600">fairly priced.</span>
          </h1>

          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-zinc-600 md:text-lg">
            Our AI turns a photo into a finished listing, priced against real sales on AllVerse and eBay. Buying? Search both in one place.
          </p>

          <form onSubmit={handleSubmit} className="mt-8" role="search">
            <label htmlFor="hero-search" className="sr-only">Search listings</label>
            <div className="flex items-center rounded-xl border border-zinc-300 bg-white p-1.5 shadow-[0_12px_32px_-16px_rgb(24_24_27/0.18)] transition focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10">
              <Search aria-hidden strokeWidth={1.75} className="ml-3 h-5 w-5 shrink-0 text-zinc-400" />
              <input
                id="hero-search"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try “Sony WH-1000XM5” or “road bike”"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base text-zinc-900 outline-none placeholder:text-zinc-400"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                title="Search by image"
                aria-label="Search by image"
              >
                <Camera strokeWidth={1.75} className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={!query.trim()}
                className="ml-1 inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white transition hover:bg-primary-700 active:scale-[0.98] disabled:bg-primary-600/50 disabled:cursor-not-allowed sm:px-5"
              >
                <Search strokeWidth={2} className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>

          {popularSearches.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
              <span className="mr-1 text-zinc-500">Popular:</span>
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    router.push(`/search?query=${encodeURIComponent(term)}`);
                  }}
                  className="rounded-md px-2 py-1 text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition hover:text-primary-700 hover:decoration-primary-600"
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          <Link
            href="/sell"
            className="group mt-8 inline-flex items-center gap-2 border-t border-zinc-200 pt-6 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Selling something? Get an AI price from a photo
            <ArrowRight strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Collage of real listings; hidden until data arrives so it never shows broken frames */}
        <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4">
          {tiles.length === 3
            ? tiles.map((l, i) => (
                <Link
                  key={l.id}
                  href={`/listings/${l.id}`}
                  style={{ '--i': i + 2 } as React.CSSProperties}
                  className={`reveal group relative overflow-hidden rounded-2xl bg-zinc-100 ${TILE_CLASSES[i]}`}
                >
                  <Image
                    src={normalizeImageSrc(l.photos![0])}
                    alt={l.title}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <span className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
                    <span className="truncate text-zinc-700">{l.title}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-zinc-950">{formatPrice(l.price)}</span>
                  </span>
                </Link>
              ))
            : TILE_CLASSES.map((cls, i) => (
                <div key={i} className={`animate-pulse rounded-2xl bg-zinc-100 ${cls}`} />
              ))}
        </div>
      </div>
      <ImageSearchModal isOpen={showImageModal} onClose={() => setShowImageModal(false)} />
    </section>
  );
}
