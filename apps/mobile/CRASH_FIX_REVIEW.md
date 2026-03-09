# App Store crash fixes – review

1. Original problems addressed

1.1 Firebase env vars missing in production (crash on launch)

- **Fix:** No env block in `eas.json` (keys stay in EAS Environment variables / Secrets, not in repo). App reads `process.env.EXPO_PUBLIC_*` at build time; EAS injects these when building.
- **Result:** Production builds get Firebase config from Expo dashboard env vars. No crash from undefined config **as long as you set those variables in the Expo project**.

1.2 No try/catch on Firebase init

- **Fix:** [lib/firebase/config.ts](lib/firebase/config.ts) – entire init is inside `try/catch`. On error, `app`, `auth`, `db`, `storage` are set to `null` and exported. No uncaught throw.
- **Result:** If config is missing or invalid, the app no longer crashes; it mounts with Firebase null. Auth flows return a clear error or no-op.

1.3 No Error Boundary

- **Fix:** [components/ErrorBoundary.tsx](components/ErrorBoundary.tsx) – class component with `getDerivedStateFromError` and `componentDidCatch`. [app/_layout.tsx](app/_layout.tsx) wraps the root with `<ErrorBoundary>`.
- **Result:** Uncaught errors in the React tree are caught and show “Something went wrong” + Retry instead of a white screen or hard crash.

1.4 JSON.parse without validation

- **Fix:** [app/(tabs)/search.tsx](app/(tabs)/search.tsx), [components/ListingCard.tsx](components/ListingCard.tsx), [app/listing/[id].tsx](app/listing/[id].tsx) – after `JSON.parse`, value is checked with `Array.isArray(parsed)` and filtered to strings; otherwise fallback to `[]`. Inner try/catch where needed.
- **Result:** Malformed or non-array AsyncStorage data no longer causes runtime errors; code always works with an array of strings.

1.5 useUnreadMessages dependency churn

- **Fix:** [hooks/useUnreadMessages.ts](hooks/useUnreadMessages.ts) – `lastOpenedTimestamp` is stored in a ref; `checkUnreadMessages` reads from the ref and no longer depends on `lastOpenedTimestamp`. Polling effect depends only on `currentUser` and the stable callback.
- **Result:** Single 5s interval per user, proper cleanup, no loop from dependency changes.

1.6 Listing “Message” → wrong route

- **Fix:** [app/listing/[id].tsx](app/listing/[id].tsx) – `handleContact` calls `POST /api/chats` with `otherUserId: listing.sellerId`, gets `chatId`, then `router.push(\`/chat/${chatId}\`)`. Loading and errors handled; `finally` clears loading state.
- **Result:** User is sent to the correct chat screen with the right chat ID.

1.7 Image onError fallback

- **Fix:** [components/ListingCard.tsx](components/ListingCard.tsx) – `imageError` state; `onError` sets it to true; when true, a placeholder (icon) is shown instead of the image. `imageError` is reset when `imageUrl` changes.
- **Result:** Failed image loads no longer leave a broken image; placeholder is shown.

1.8 NSLocalNetworkUsageDescription

- **Fix:** [app.json](app.json) – added under `expo.ios.infoPlist`.
- **Result:** Meets iOS expectations and reduces review issues.

1.9 Messages polling cleanup

- **Fix:** [app/(tabs)/messages.tsx](app/(tabs)/messages.tsx) – single interval with `return () => clearInterval(interval)` in the effect. `fetchChats` is stable (`useCallback` with `[currentUser]`).
- **Result:** No interval leak; cleanup on unmount or when user changes.

