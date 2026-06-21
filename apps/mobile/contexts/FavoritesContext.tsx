import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../lib/api/client';

/**
 * Single source of truth for the signed-in user's favorited listing IDs,
 * backed by the real `/api/favorites` endpoint (not device-local storage).
 *
 * Loads the user's favorites once on auth change and exposes optimistic
 * `toggle` / `isFavorite` so cards, the home badge, and the favorites screen
 * all agree.
 */
interface FavoritesContextValue {
  favoriteIds: Set<string>;
  count: number;
  isFavorite: (listingId: string) => boolean;
  toggle: (listingId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const inFlight = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setFavoriteIds(new Set());
      return;
    }
    try {
      const res = await apiClient.get('/api/favorites', true);
      if (res.ok) {
        const data = await res.json();
        const ids: string[] = Array.isArray(data?.data) ? data.data : [];
        setFavoriteIds(new Set(ids));
      }
    } catch {
      // Leave current state on failure.
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorite = useCallback((listingId: string) => favoriteIds.has(listingId), [favoriteIds]);

  const toggle = useCallback(
    async (listingId: string) => {
      if (!currentUser || inFlight.current.has(listingId)) return;
      inFlight.current.add(listingId);

      const wasFavorite = favoriteIds.has(listingId);
      // Optimistic update.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      try {
        if (wasFavorite) {
          await apiClient.delete(`/api/favorites/${listingId}`, true);
        } else {
          await apiClient.post('/api/favorites', { listingId }, true);
        }
      } catch {
        // Roll back on failure.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
      } finally {
        inFlight.current.delete(listingId);
      }
    },
    [currentUser?.uid, favoriteIds]
  );

  return (
    <FavoritesContext.Provider
      value={{ favoriteIds, count: favoriteIds.size, isFavorite, toggle, refresh }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    // Safe fallback so a component outside the provider doesn't crash.
    return {
      favoriteIds: new Set(),
      count: 0,
      isFavorite: () => false,
      toggle: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}
