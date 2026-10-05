'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

const PANEL_POINTS = [
  { title: 'Photos to a draft listing', body: 'Upload a few photos and the AI drafts the title, description and details. You review and edit before anything goes live.' },
  { title: 'A price to start from', body: 'You get a suggested price based on comparable listings. You set the final number.' },
  { title: 'Checkout through Stripe', body: 'Buyers pay by card through Stripe. Orders and tracking live in your account.' },
  { title: 'Free to list', body: 'Listing costs nothing. When an item sells, the fee is 4.5% of the item price.' },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <header className="px-4 py-4 sm:px-6">
        <Link href="/" aria-label="AllVerse home" className="inline-flex">
          <Logo size="md" />
        </Link>
      </header>
      <div className="grid flex-1 lg:grid-cols-2">
        <main className="w-full px-4 pb-20 pt-10 sm:px-6 lg:px-16 lg:pt-20">
          <div className="w-full max-w-sm animate-fade-in">{children}</div>
        </main>
        <aside className="border-t border-zinc-200 bg-zinc-50 px-4 py-12 sm:px-6 lg:border-l lg:border-t-0 lg:px-16 lg:py-20">
          <div className="max-w-md">
            <h2 className="font-semibold text-zinc-950">What AllVerse does</h2>
            <p className="mt-2 text-sm text-zinc-600">A marketplace for buying and selling secondhand items.</p>
            <dl className="mt-8 space-y-6">
              {PANEL_POINTS.map((p, i) => (
                <div key={p.title} className="reveal" style={{ '--i': i } as React.CSSProperties}>
                  <dt className="text-sm font-medium text-zinc-950">{p.title}</dt>
                  <dd className="mt-1 text-sm text-zinc-600">{p.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
