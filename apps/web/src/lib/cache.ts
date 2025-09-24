import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Server-side caching utilities for RSC data fetching

// Cache for static data that doesn't change often
export const getCachedStaticData = cache(async (key: string) => {
  // This will be cached per request
  return await fetch(`/api/static/${key}`);
});

// Cache for user-specific data with longer TTL
export const getCachedUserData = unstable_cache(
  async (userId: string, dataType: string) => {
    // This will be cached for 5 minutes
    return await fetch(`/api/user/${userId}/${dataType}`);
  },
  ['user-data'],
  { revalidate: 300 }
);

// Cache for public listings data
export const getCachedListings = unstable_cache(
  async (filters: Record<string, any>) => {
    const params = new URLSearchParams(filters);
    return await fetch(`/api/listings?${params}`);
  },
  ['listings'],
  { revalidate: 60 }
);

// Cache for categories (rarely change)
export const getCachedCategories = unstable_cache(
  async () => {
    return await fetch('/api/categories');
  },
  ['categories'],
  { revalidate: 3600 } // 1 hour
);

// Cache for AI analysis results (expensive operation)
export const getCachedAIAnalysis = unstable_cache(
  async (imageHash: string) => {
    return await fetch(`/api/ai/analyze?hash=${imageHash}`);
  },
  ['ai-analysis'],
  { revalidate: 1800 } // 30 minutes
);

// Helper to create cache keys
export const createCacheKey = (...parts: (string | number)[]): string => {
  return parts.join(':');
};

// Helper to invalidate cache
export const invalidateCache = async (tags: string[]) => {
  // This would be used with revalidateTag in production
  console.log('Invalidating cache for tags:', tags);
};
