"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Search } from "lucide-react";

type Props = {
  initialQuery?: string;
  initialSort?: "recent" | "price_asc" | "price_desc";
  initialView?: "comfortable" | "compact";
};

export function ListingFilters({ 
  initialQuery = "", 
  initialSort = "recent",
  initialView = "comfortable" 
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const current = new URLSearchParams(searchParams.toString());
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    // Always reset to page 1 on filter change
    current.set('page', '1');

    router.push(`?${current.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSearchChange = (value: string) => {
    setQuery(value);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      updateUrl({ q: value });
    }, 300);

    setDebounceTimer(timer);
  };

  const handleSortChange = (value: string) => {
    updateUrl({ sort: value });
  };

  const handleViewChange = (value: string) => {
    updateUrl({ view: value });
  };

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <div className="sticky top-16 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 py-4 mb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Search listings"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition"
              aria-label="Search listings"
            />
          </div>

          {/* Sort */}
          <select
            defaultValue={initialSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="h-10 px-3 pr-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition"
            aria-label="Sort listings"
          >
            <option value="recent">Recent</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          {/* View Density */}
          <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 bg-white dark:bg-zinc-900">
            <button
              onClick={() => handleViewChange("comfortable")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                initialView === "comfortable"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              aria-label="Comfortable view"
            >
              Comfortable
            </button>
            <button
              onClick={() => handleViewChange("compact")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                initialView === "compact"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              aria-label="Compact view"
            >
              Compact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

