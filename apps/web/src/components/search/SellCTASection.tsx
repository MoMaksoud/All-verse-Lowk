'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function SellCTASection() {
  return (
    <section className="grid grid-cols-1 items-center gap-6 rounded-3xl bg-zinc-950 px-6 py-10 sm:px-10 md:grid-cols-[1.5fr_1fr] md:py-12">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl">
          Own one of these? See what yours is worth.
        </h2>
        <p className="mt-3 max-w-[48ch] text-zinc-400">
          Upload a photo and the assistant drafts the listing and suggests a price from recent sales.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
        <Link
          href="/sell"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-primary-500 active:scale-[0.98]"
        >
          Price my item
          <ArrowRight strokeWidth={2} className="h-4 w-4" />
        </Link>
        <Link
          href="/listings"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white active:scale-[0.98]"
        >
          Browse marketplace
        </Link>
      </div>
    </section>
  );
}
