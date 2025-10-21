'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { LocationAutocomplete } from './LocationAutocomplete';
import Select from './Select';
import type { ListingFilters, Category } from '@marketplace/types';

interface ListingFiltersProps {
  filters: ListingFilters;
  categories: Category[];
  onFiltersChange: (filters: ListingFilters) => void;
}

export function ListingFilters({ filters, categories, onFiltersChange }: ListingFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ListingFilters>(filters);

  // Sync local filters with props when they change (e.g., from URL params)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof ListingFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    // Don't auto-apply - only update local state
  };

  const handleLocationChange = (location: string, coordinates?: { lat: number; lng: number }) => {
    const newFilters = { 
      ...localFilters, 
      location,
      userCoordinates: coordinates
    };
    setLocalFilters(newFilters);
    // Don't auto-apply - only update local state
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: ListingFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Clear any pending debounced calls and apply immediately
      onFiltersChange(localFilters);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <aside className="rounded-2xl border border-white/10 bg-[#0B1220] p-4 sm:p-5 md:p-6 shadow-lg/30">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition"
            >
              <X className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>

        {/* Search */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-300/80 uppercase">Search</h3>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              value={localFilters.keyword || ''}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search listings..."
              className="h-10 w-full min-w-0 rounded-xl border border-white/10 bg-[#0E1526] pl-9 px-3 text-sm text-zinc-100
                         placeholder:text-zinc-400 shadow-sm focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 outline-none transition"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Select
            label="Category"
            value={localFilters.category || null}
            onChange={(value) => handleFilterChange('category', value)}
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map((category) => ({
                value: category.id,
                label: category.name
              }))
            ]}
            placeholder="All Categories"
          />
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-300/80 uppercase">Price Range</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={localFilters.minPrice || ''}
              onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
              onKeyPress={handleKeyPress}
              placeholder="Min"
              inputMode="numeric"
              className="h-10 w-full min-w-0 rounded-xl border border-white/10 bg-[#0E1526] px-3 text-sm text-zinc-100
                         placeholder:text-zinc-400 shadow-sm focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 outline-none transition"
            />
            <input
              type="number"
              value={localFilters.maxPrice || ''}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
              onKeyPress={handleKeyPress}
              placeholder="Max"
              inputMode="numeric"
              className="h-10 w-full min-w-0 rounded-xl border border-white/10 bg-[#0E1526] px-3 text-sm text-zinc-100
                         placeholder:text-zinc-400 shadow-sm focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 outline-none transition"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-300/80 uppercase">Location</h3>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
              <MapPin className="h-5 w-5" />
            </span>
            <LocationAutocomplete
              value={localFilters.location || ''}
              onChange={handleLocationChange}
              placeholder="City, State or ZIP code..."
              inputClassName="h-10 w-full rounded-xl border border-white/10 bg-[#0E1526] pl-10 px-3 text-sm text-zinc-100
                             placeholder:text-zinc-400 shadow-sm focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 outline-none transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Within</span>
            <button
              type="button"
              className="inline-flex items-center h-9 rounded-xl border border-white/10 bg-[#10192D] px-3 text-xs font-medium
                         text-zinc-200 hover:bg-[#12203A] focus:ring-2 focus:ring-blue-500/60 outline-none transition"
            >
              {localFilters.maxDistance ? `${localFilters.maxDistance} miles` : 'Any distance'}
            </button>
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <Select
            label="Condition"
            value={localFilters.condition || null}
            onChange={(value) => handleFilterChange('condition', value)}
            options={[
              { value: '', label: 'Any Condition' },
              { value: 'new', label: 'New' },
              { value: 'like-new', label: 'Like New' },
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' },
              { value: 'poor', label: 'Poor' }
            ]}
            placeholder="Any Condition"
          />
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Select
            label="Sort By"
            value={localFilters.sortBy || null}
            onChange={(value) => handleFilterChange('sortBy', value)}
            options={[
              { value: '', label: 'Relevance' },
              { value: 'price', label: 'Price' },
              { value: 'date', label: 'Date' }
            ]}
            placeholder="Relevance"
          />
        </div>

        {/* Apply Button */}
        <div className="pt-2">
          <button
            onClick={handleApplyFilters}
            className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg
                       hover:bg-blue-500 active:bg-blue-700 focus:ring-2 focus:ring-blue-500/60 transition"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </aside>
  );
}
