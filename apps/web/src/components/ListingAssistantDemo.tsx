'use client';

import React, { memo, useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { SimpleListing } from '@marketplace/types';
import { normalizeImageSrc } from '@marketplace/shared-logic';

// Looping illustration of the sell flow: photo -> drafted fields -> price range.
// Steps: 0 reading photo, 1-3 fields appear, 4 price range, 5 hold.
const STEP_MS = 1100;
const STEPS = 9;

function money(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function ListingAssistantDemo({ listing }: { listing?: SimpleListing }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(5);
      return;
    }
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS), STEP_MS);
    return () => clearInterval(id);
  }, []);

  const price = Number(listing?.price) || 140;
  const low = price * 0.9;
  const high = price * 1.08;
  const comps = [
    { value: price * 0.86 },
    { value: price * 0.98 },
    { value: price * 1.14 },
  ];
  const min = price * 0.8;
  const max = price * 1.2;
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;

  const fields = [
    { label: 'Title', value: listing?.title ?? 'DeWalt 20V MAX Drill + Impact Driver Combo Kit' },
    { label: 'Category', value: listing?.category ?? 'Tools' },
    { label: 'Condition', value: listing?.condition || 'Used, good. Light wear on grip' },
  ];
  const imgSrc = normalizeImageSrc(listing?.photos?.[0] || '');

  return (
    <div
      aria-label="Example of the AllVerse listing assistant"
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_24px_48px_-24px_rgb(24_24_27/0.18)] sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-900">
          <Sparkles strokeWidth={1.75} className="h-4 w-4 text-primary-600" />
          Listing assistant
        </span>
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Example
        </span>
      </div>

      <div className="grid grid-cols-[96px_1fr] gap-4 sm:grid-cols-[148px_1fr] sm:gap-6">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
          {imgSrc && <Image src={imgSrc} alt="" fill sizes="148px" className="object-cover" />}
          {/* scan line while "reading" the photo */}
          <div
            className={clsx(
              'pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-primary-500/30 to-transparent transition-opacity duration-300',
              step === 0 ? 'animate-scan opacity-100' : 'opacity-0'
            )}
          />
        </div>

        <dl className="min-w-0 space-y-3 sm:space-y-4">
          {fields.map((f, i) => {
            const shown = step > i;
            return (
              <div key={f.label} className="min-w-0">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{f.label}</dt>
                <dd className="relative mt-0.5 h-5">
                  <span
                    className={clsx(
                      'absolute inset-0 truncate text-sm text-zinc-900 transition-all duration-500 ease-out first-letter:uppercase',
                      shown ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                    )}
                  >
                    {f.value}
                  </span>
                  <span
                    className={clsx(
                      'absolute inset-y-0.5 left-0 rounded bg-zinc-100 transition-opacity duration-300',
                      i === 0 ? 'w-4/5' : 'w-1/3',
                      shown ? 'opacity-0' : 'animate-pulse opacity-100'
                    )}
                  />
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div
        className={clsx(
          'mt-6 rounded-xl bg-zinc-50 p-4 transition-all duration-500 ease-out sm:p-5',
          step >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-40'
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-zinc-500">Suggested price</span>
          <span className="text-xl font-semibold tabular-nums text-zinc-950">
            {money(low)} to {money(high)}
          </span>
        </div>

        {/* range bar with comparable sales */}
        <div className="relative mt-5 h-10">
          <div className="absolute inset-x-0 top-2 h-1.5 rounded-full bg-zinc-200" />
          <div
            className={clsx(
              'absolute top-2 h-1.5 origin-left rounded-full bg-primary-600 transition-transform duration-700 ease-out',
              step >= 4 ? 'scale-x-100' : 'scale-x-0'
            )}
            style={{ left: pos(low), width: `calc(${pos(high)} - ${pos(low)})` }}
          />
          {comps.map((c, i) => (
            <div
              key={i}
              className={clsx(
                'absolute top-0 -translate-x-1/2 transition-opacity duration-500',
                step >= 4 ? 'opacity-100' : 'opacity-0'
              )}
              style={{ left: pos(c.value), transitionDelay: `${200 + i * 120}ms` }}
            >
              <div className="mx-auto h-5 w-px bg-zinc-400" />
              <span className="mt-1 block whitespace-nowrap text-[11px] tabular-nums text-zinc-500">
                {money(c.value)}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
          <Check strokeWidth={2} className="h-3.5 w-3.5 text-primary-600" />
          Based on {comps.length} recent sales on AllVerse and eBay
        </p>
      </div>
    </div>
  );
}

export default memo(ListingAssistantDemo);
