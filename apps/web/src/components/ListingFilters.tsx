'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, Navigation } from 'lucide-react';
import { LocationAutocomplete } from './LocationAutocomplete';
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
  };

  const handleLocationChange = (location: string, coordinates?: { lat: number; lng: number }) => {
    const newFilters = { 
      ...localFilters, 
      location,
      userCoordinates: coordinates
    };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: ListingFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <div className="bg-dark-surface rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={localFilters.keyword || ''}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            placeholder="Search listings..."
            className="w-full pl-10 pr-3 py-2 border border-dark-border rounded-md text-sm bg-dark-surface text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      {/* Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Category
        </label>
        <select
          value={localFilters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-dark-border rounded-md text-sm bg-dark-surface text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          style={{ colorScheme: 'dark' }}
        >
          <option value="" className="bg-dark-surface text-white">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id} className="bg-dark-surface text-white">
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={localFilters.minPrice || ''}
            onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="Min"
            className="px-3 py-2 border border-dark-border rounded-md text-sm bg-dark-surface text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            style={{ colorScheme: 'dark' }}
          />
          <input
            type="number"
            value={localFilters.maxPrice || ''}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="Max"
            className="px-3 py-2 border border-dark-border rounded-md text-sm bg-dark-surface text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      {/* Location */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Location
        </label>
        <LocationAutocomplete
          value={localFilters.location || ''}
          onChange={handleLocationChange}
          placeholder="City, State or ZIP code..."
        />
        
        {/* Distance Range */}
        <div className="flex items-center gap-2 mt-3">
          <Navigation className="text-gray-400 w-4 h-4" />
          <span className="text-sm text-gray-300">Within</span>
          <select
            value={localFilters.maxDistance || ''}
            onChange={(e) => handleFilterChange('maxDistance', e.target.value ? parseInt(e.target.value) : undefined)}
            className="px-3 py-1 border border-dark-border rounded-md text-sm bg-dark-surface text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            style={{ colorScheme: 'dark' }}
          >
            <option value="" className="bg-dark-surface text-white">Any distance</option>
            <option value="5" className="bg-dark-surface text-white">5 miles</option>
            <option value="10" className="bg-dark-surface text-white">10 miles</option>
            <option value="25" className="bg-dark-surface text-white">25 miles</option>
            <option value="50" className="bg-dark-surface text-white">50 miles</option>
            <option value="100" className="bg-dark-surface text-white">100 miles</option>
          </select>
        </div>
      </div>

      {/* Condition */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Condition
        </label>
        <select
          value={localFilters.condition || ''}
          onChange={(e) => handleFilterChange('condition', e.target.value)}
          className="w-full px-3 py-2 border border-dark-border rounded-md text-sm bg-dark-surface text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          style={{ colorScheme: 'dark' }}
        >
          <option value="" className="bg-dark-surface text-white">Any Condition</option>
          <option value="new" className="bg-dark-surface text-white">New</option>
          <option value="like-new" className="bg-dark-surface text-white">Like New</option>
          <option value="good" className="bg-dark-surface text-white">Good</option>
          <option value="fair" className="bg-dark-surface text-white">Fair</option>
          <option value="poor" className="bg-dark-surface text-white">Poor</option>
        </select>
      </div>

      {/* Sort By */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Sort By
        </label>
        <select
          value={localFilters.sortBy || ''}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className="w-full px-3 py-2 border border-dark-border rounded-md text-sm bg-dark-surface text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          style={{ colorScheme: 'dark' }}
        >
          <option value="" className="bg-dark-surface text-white">Relevance</option>
          <option value="price" className="bg-dark-surface text-white">Price</option>
          <option value="date" className="bg-dark-surface text-white">Date</option>
        </select>
      </div>

      {/* Apply Filters Button */}
      <button
        onClick={handleApplyFilters}
        className="w-full bg-accent-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
      >
        Apply Filters
      </button>
    </div>
  );
}
