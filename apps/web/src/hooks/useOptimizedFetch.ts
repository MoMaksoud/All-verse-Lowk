import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 60000; // 1 minute

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  isStale(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    return Date.now() - entry.timestamp > ttl / 2;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

const dataCache = new DataCache();

interface UseOptimizedFetchOptions {
  enabled?: boolean;
  ttl?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useOptimizedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseOptimizedFetchOptions = {}
) {
  const { enabled = true, ttl = 60000, onSuccess, onError } = options;
  
  const [data, setData] = useState<T | null>(() => {
    // Try to get cached data immediately
    return dataCache.get<T>(key) || null;
  });
  const [loading, setLoading] = useState(!dataCache.has(key));
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    // Check cache first
    const cachedData = dataCache.get<T>(key);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return cachedData;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await fetcher();
      
      // Cache the result
      dataCache.set(key, result, ttl);
      
      setData(result);
      onSuccess?.(result);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, onSuccess, onError]);

  const refetch = useCallback(() => {
    // Clear cache for this key and refetch
    dataCache.delete(key);
    return fetchData();
  }, [key, fetchData]);

  useEffect(() => {
    if (enabled && !dataCache.has(key)) {
      fetchData().catch(err => {
        console.error('Failed to fetch data for key:', key, err);
      });
    }
  }, [enabled, key, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale: data ? dataCache.isStale(key, ttl) : false
  };
}

// Export cache for manual management
export { dataCache };
