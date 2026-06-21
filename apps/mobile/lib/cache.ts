type CacheEntry<T> = { data: T; ts: number };
const store = new Map<string, CacheEntry<any>>();

export function getCache<T>(key: string, ttlMs: number): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) return null;
  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}
