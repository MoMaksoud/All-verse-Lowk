import { useFavorites } from '../contexts/FavoritesContext';

/**
 * Returns the number of listings the signed-in user has favorited.
 * Backed by the server (`/api/favorites`) via FavoritesContext, so it stays in
 * sync with the favorites screen and the heart state on cards.
 */
export function useFavoritesCount(): number {
  return useFavorites().count;
}
