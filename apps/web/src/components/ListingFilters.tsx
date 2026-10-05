'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import type { ListingFilters } from '@marketplace/types';
import { CATEGORIES } from '@/lib/categories';

interface ListingFiltersProps {
  filters: ListingFilters;
  onFiltersChange: (filters: ListingFilters) => void;
}

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const inputClass =
  'h-10 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-200 py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-sm font-semibold text-zinc-950">{title}</h3>
      {children}
    </section>
  );
}

export function ListingFilters({ filters, onFiltersChange }: ListingFiltersProps) {
  // Text and price inputs are drafted locally and applied on Enter / Apply;
  // category and condition apply immediately.
  const [draft, setDraft] = useState<ListingFilters>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const apply = (patch: Partial<ListingFilters> = {}) => onFiltersChange({ ...draft, ...patch });

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply();
    }
  };

  const priceInvalid =
    draft.minPrice !== undefined && draft.maxPrice !== undefined && draft.minPrice > draft.maxPrice;

  return (
    <aside aria-label="Filters">
      <Section title="Search">
        <div className="relative">
          <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <label htmlFor="filter-keyword" className="sr-only">Keyword</label>
          <input
            id="filter-keyword"
            type="text"
            value={draft.keyword || ''}
            onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
            onKeyDown={onEnter}
            placeholder="Keyword"
            className={clsx(inputClass, 'pl-9')}
          />
        </div>
      </Section>

      <Section title="Category">
        <ul className="-mx-2 space-y-0.5">
          {[{ id: '', label: 'All categories' }, ...CATEGORIES].map((c) => {
            const active = (filters.category || '') === c.id;
            return (
              <li key={c.id || 'all'}>
                <button
                  type="button"
                  onClick={() => apply({ category: c.id || undefined })}
                  aria-pressed={active}
                  className={clsx(
                    'w-full rounded-md px-2 py-1.5 text-left text-sm transition',
                    active ? 'bg-primary-50 font-medium text-primary-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  )}
                >
                  {c.label}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Price">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <label className="sr-only" htmlFor="filter-min">Minimum price</label>
          <input
            id="filter-min"
            type="number"
            min={0}
            inputMode="numeric"
            value={draft.minPrice ?? ''}
            onChange={(e) => setDraft({ ...draft, minPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
            onKeyDown={onEnter}
            placeholder="$ Min"
            className={inputClass}
          />
          <span className="text-zinc-400">to</span>
          <label className="sr-only" htmlFor="filter-max">Maximum price</label>
          <input
            id="filter-max"
            type="number"
            min={0}
            inputMode="numeric"
            value={draft.maxPrice ?? ''}
            onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
            onKeyDown={onEnter}
            placeholder="$ Max"
            className={inputClass}
          />
        </div>
        {priceInvalid && <p className="mt-2 text-xs text-red-600">Minimum is higher than maximum.</p>}
        <button
          type="button"
          onClick={() => apply()}
          disabled={priceInvalid}
          className="btn btn-outline mt-3 w-full py-2"
        >
          Apply price
        </button>
      </Section>

      <Section title="Condition">
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => {
            const active = filters.condition === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => apply({ condition: active ? undefined : c.value })}
                aria-pressed={active}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-sm transition active:scale-[0.97]',
                  active
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-950'
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Section>
    </aside>
  );
}
