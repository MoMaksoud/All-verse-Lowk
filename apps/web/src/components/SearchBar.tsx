'use client';

import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

interface SearchBarProps {
  className?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({ className = '', onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for anything..."
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            type="button"
            className="h-full px-3 text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>
    </form>
  );
}
