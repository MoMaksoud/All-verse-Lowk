'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { ResourcePreloader } from '@/components/ResourcePreloader';
import { useOptimizedFetch } from '@/hooks/useOptimizedFetch';
import ListingCard, { ListingCardSkeleton } from '@/components/ListingCard';
import { UniversalSearchHero } from '@/components/search/UniversalSearchHero';
import ListingAssistantDemo from '@/components/ListingAssistantDemo';
import { CATEGORIES } from '@/lib/categories';

const FEATURED_LIMIT = 8;

const STEPS = [
  {
    title: 'Photo in, listing out',
    body: 'It drafts the title, description, category and condition, then asks about anything the photos can\'t show.',
  },
  {
    title: 'A price that actually sells',
    body: 'You get a suggested range built from live AllVerse and eBay data, with the reasoning shown.',
  },
  {
    title: 'Nothing posts without you',
    body: 'Edit any field before it goes live. Offers and checkout then happen in one thread.',
  },
];

export default function HomePage() {
  const fetchFeaturedListings = useCallback(async () => {
    try {
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet(`/api/listings?limit=${FEATURED_LIMIT}`, {
        requireAuth: false,
        headers: {
          'Cache-Control': 'max-age=15',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch listings: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      console.error('Error fetching featured listings:', error);
      return [];
    }
  }, []);

  const { data: featuredListings = [], loading } = useOptimizedFetch<SimpleListing[]>(
    'featured-listings',
    fetchFeaturedListings,
    { ttl: 15000 }
  );
  const listings = featuredListings ?? [];
  // Skip the three hero collage items so the demo shows something new
  const demoListing = listings.find((l) => /dewalt/i.test(l.title)) ?? listings[3];

  return (
    <div className="min-h-screen bg-white">
      <ResourcePreloader />

      <UniversalSearchHero listings={listings} />

      {/* Category rail */}
      <nav aria-label="Shop by category" className="border-y border-zinc-200">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3 scrollbar-hide sm:px-6 lg:px-8">
          {CATEGORIES.filter((c) => c.id !== 'other').map((c) => (
            <Link
              key={c.id}
              href={`/listings?category=${c.id}`}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* AI listing assistant */}
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:px-8">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700">
              <Sparkles strokeWidth={1.75} className="h-4 w-4" />
              AI listing assistant
            </p>
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-zinc-950 md:text-[2.75rem]">
              Take a photo. We&apos;ll write the listing and tell you what it&apos;s worth.
            </h2>

            <ol className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
              {STEPS.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-3 py-5">
                  <span className="pt-0.5 text-sm font-medium tabular-nums text-primary-600">0{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-zinc-950">{step.title}</h3>
                    <p className="mt-1 max-w-[52ch] text-[15px] leading-relaxed text-zinc-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/sell" className="btn btn-primary gap-2 px-5 py-3">
                List an item with AI
                <ArrowRight strokeWidth={2} className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="group inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-primary-700"
              >
                How pricing works
                <ArrowUpRight strokeWidth={2} className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <ListingAssistantDemo listing={demoListing} />
        </div>
      </section>

      {/* Just listed */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">Just listed</h2>
            <p className="mt-1 text-sm text-zinc-500">The newest items on AllVerse.</p>
          </div>
          <Link
            href="/listings"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Browse all
            <ArrowRight strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {Array.from({ length: FEATURED_LIMIT }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {listings.map((listing, i) => (
              <div key={listing.id} className="reveal" style={{ '--i': i } as React.CSSProperties}>
                <ListingCard
                  variant="grid"
                  id={listing.id}
                  title={listing.title}
                  description={listing.description}
                  price={listing.price}
                  category={listing.category}
                  condition={listing.condition}
                  imageUrl={listing.photos?.[0] || null}
                  sellerId={listing.sellerId}
                  sellerProfile={(listing as any).sellerProfile}
                  sold={(listing as any).sold}
                  soldThroughAllVerse={(listing as any).soldThroughAllVerse}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-zinc-300 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-zinc-900">Nothing listed yet</p>
              <p className="mt-1 text-sm text-zinc-500">Be the first. Upload a photo and the assistant drafts the rest.</p>
            </div>
            <Link href="/sell" className="btn btn-primary gap-2">
              List an item
              <ArrowRight strokeWidth={2} className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* Seller CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 rounded-3xl bg-zinc-950 px-6 py-12 sm:px-10 md:grid-cols-[1.4fr_1fr] md:px-14 md:py-16">
          <div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
              That drill in the garage is worth $140 to someone.
            </h2>
            <p className="mt-4 max-w-[48ch] text-zinc-400">
              Snap a photo and the assistant drafts the listing. Buyers pay through Stripe, and the money goes to your connected Stripe account.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Link
              href="/sell"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-primary-500 active:scale-[0.98]"
            >
              Start selling
              <ArrowRight strokeWidth={2} className="h-4 w-4" />
            </Link>
            <Link
              href="/ai"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white active:scale-[0.98]"
            >
              Ask the assistant
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
