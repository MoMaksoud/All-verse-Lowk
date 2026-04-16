import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * useFavoritesCount
 *
 * Lightweight hook that returns the number of listing IDs currently stored in
 * the local `favorites` AsyncStorage key. Favorites are client-only on both
 * web and mobile today, so we simply read the array and return its length.
 *
 * Because AsyncStorage has no change-event API and multiple screens can mutate
 * the favorites list, we poll every 2 seconds. Reads are local I/O and cheap.
 *
 * Follows the same pattern as `useUnreadMessages`, just against AsyncStorage
 * instead of the chats API.
 */
export function useFavoritesCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      try {
        const raw = await AsyncStorage.getItem('favorites');
        if (cancelled) return;
        if (!raw) {
          setCount(0);
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          const arr = Array.isArray(parsed)
            ? parsed.filter((x): x is string => typeof x === 'string')
            : [];
          setCount(arr.length);
        } catch {
          setCount(0);
        }
      } catch {
        // Ignore read errors; leave count as-is.
      }
    };

    read();
    const interval = setInterval(read, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}
