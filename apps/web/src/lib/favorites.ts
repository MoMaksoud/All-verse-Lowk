import { apiDelete, apiGet, apiPost } from '@/lib/api-client';

// Favorites live in Firestore (favorites/{uid}.listingIds) behind /api/favorites.
// ponytail: one cached id set per page load; cleared on every write. Reload to pick up other tabs.
let cache: Promise<Set<string> | null> | null = null;

async function fetchIds(): Promise<Set<string> | null> {
  try {
    const res = await apiGet('/api/favorites');
    return res.ok ? new Set<string>((await res.json()).data ?? []) : null;
  } catch {
    return null;
  }
}

// A failed load (e.g. auth not restored yet) is not cached, so the next call retries.
export function loadFavoriteIds(): Promise<Set<string>> {
  cache ??= fetchIds();
  return cache.then((ids) => {
    if (!ids) {
      cache = null;
      return new Set<string>();
    }
    return ids;
  });
}

export async function setFavorite(listingId: string, favorited: boolean): Promise<void> {
  const res = favorited
    ? await apiPost('/api/favorites', { listingId })
    : await apiDelete(`/api/favorites/${listingId}`);
  cache = null;
  if (!res.ok) throw new Error('Failed to update favorites');
}
