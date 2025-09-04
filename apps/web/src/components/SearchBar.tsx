'use client';

import React, { useState } from 'react';
import { Search, Mic } from 'lucide-react';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({ 
  className = '', 
  placeholder = "Search for anything...",
  onSearch 
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="input pl-12 pr-20 w-full"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 gap-2">
          <button
            type="button"
            className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
            title="Voice Search"
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="submit"
            className="btn btn-primary px-4 py-2"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
