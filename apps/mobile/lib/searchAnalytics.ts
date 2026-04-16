/**
 * Search Analytics & Autocomplete — mobile port of apps/web/src/lib/searchAnalytics.ts
 *
 * Keeps mobile and web in feature parity on the "Popular searches" chips the
 * home hero shows. The data set and sort order are kept identical to the web
 * version so both platforms surface the same trending queries.
 *
 * If/when the web switches to an actual backend endpoint, replace
 * `getPopularSearches` in this file with a fetch to the same URL.
 */

export interface SearchQuery {
  query: string;
  count: number;
  lastSearched: string;
  category?: string;
  isTrending?: boolean;
}

export interface SearchSuggestion {
  text: string;
  type: 'popular' | 'trending' | 'recent' | 'category';
  count?: number;
  category?: string;
}

// Keep this array in sync with apps/web/src/lib/searchAnalytics.ts
const searchDatabase: SearchQuery[] = [
  // Electronics
  { query: 'iphone', count: 1250, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'iphone 15', count: 890, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'iphone 15 pro', count: 650, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'iphone 14', count: 420, lastSearched: '2024-01-19', category: 'electronics' },
  { query: 'iphone 13', count: 380, lastSearched: '2024-01-19', category: 'electronics' },
  { query: 'macbook', count: 980, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'macbook air', count: 720, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'macbook pro', count: 580, lastSearched: '2024-01-19', category: 'electronics' },
  { query: 'laptop', count: 1100, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'gaming laptop', count: 450, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'samsung', count: 680, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'samsung galaxy', count: 420, lastSearched: '2024-01-20', category: 'electronics' },
  { query: 'samsung s24', count: 350, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'ipad', count: 520, lastSearched: '2024-01-19', category: 'electronics' },
  { query: 'airpods', count: 450, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'apple watch', count: 380, lastSearched: '2024-01-19', category: 'electronics' },
  { query: 'playstation', count: 420, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'playstation 5', count: 350, lastSearched: '2024-01-20', category: 'electronics', isTrending: true },
  { query: 'xbox', count: 280, lastSearched: '2024-01-19', category: 'electronics' },
  { query: 'nintendo switch', count: 320, lastSearched: '2024-01-19', category: 'electronics' },

  // Fashion
  { query: 'nike', count: 950, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'nike shoes', count: 680, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'nike air max', count: 520, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'jordan', count: 720, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'jordan 1', count: 580, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'adidas', count: 680, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'yeezy', count: 520, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'shoes', count: 1200, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'sneakers', count: 850, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'clothes', count: 680, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },
  { query: 'watch', count: 450, lastSearched: '2024-01-20', category: 'fashion', isTrending: true },

  // Home
  { query: 'furniture', count: 520, lastSearched: '2024-01-20', category: 'home', isTrending: true },

  // Sports
  { query: 'gym', count: 420, lastSearched: '2024-01-20', category: 'sports', isTrending: true },

  // Automotive
  { query: 'car', count: 680, lastSearched: '2024-01-20', category: 'automotive', isTrending: true },
  { query: 'tesla', count: 520, lastSearched: '2024-01-20', category: 'automotive', isTrending: true },

  // Modifiers
  { query: 'cheap', count: 450, lastSearched: '2024-01-20', category: 'modifier', isTrending: true },
  { query: 'used', count: 680, lastSearched: '2024-01-20', category: 'modifier', isTrending: true },
  { query: 'new', count: 520, lastSearched: '2024-01-20', category: 'modifier', isTrending: true },
];

/**
 * Popular / trending searches for the home hero. Mirrors the web sort order:
 * trending first, then count descending.
 */
export function getPopularSearches(limit: number = 4): SearchQuery[] {
  return [...searchDatabase]
    .sort((a, b) => {
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      return b.count - a.count;
    })
    .slice(0, limit);
}

/**
 * Simple prefix-based autocomplete. Mirrors the web version's ordering rules
 * (trending first, then popularity, then recency). Implemented without a Trie
 * since the dataset is small and this runs infrequently on mobile.
 */
export function getAutocompleteSuggestions(
  query: string,
  limit: number = 8,
): SearchSuggestion[] {
  if (!query || query.length < 1) return [];
  const prefix = query.toLowerCase();

  const matches = searchDatabase
    .filter((q) => q.query.toLowerCase().startsWith(prefix))
    .sort((a, b) => {
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      if (b.count !== a.count) return b.count - a.count;
      return (
        new Date(b.lastSearched).getTime() - new Date(a.lastSearched).getTime()
      );
    })
    .slice(0, limit);

  return matches.map((m) => ({
    text: m.query,
    type: m.isTrending ? 'trending' : 'popular',
    count: m.count,
    category: m.category,
  }));
}
