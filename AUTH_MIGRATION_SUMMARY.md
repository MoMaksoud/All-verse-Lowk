# Firebase Auth Token Verification Migration Summary

## Overview
This migration updates the entire codebase to use Firebase Auth token verification server-side instead of trusting client-provided `x-user-id` headers. This is a critical security improvement.

## Files Changed

### 1. Core Infrastructure Files

#### `apps/web/src/lib/firebase-admin.ts` (NEW)
- Created Firebase Admin SDK initialization
- Exports `verifyIdToken()` function for token verification
- Supports service account JSON or default credentials

#### `apps/web/src/lib/withApi.ts` (MODIFIED)
- Added `verifyFirebaseToken()` helper function
- Extracts Bearer token from Authorization header
- Verifies token using Firebase Admin SDK
- Attaches `userId` to request object
- Returns 401 if token is missing or invalid
- Added `requireAuth` option (default: true)

#### `apps/web/src/lib/api-client.ts` (NEW)
- Created frontend API client utility
- Automatically includes Authorization header with Firebase token
- Provides `apiRequest()`, `apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()` helpers
- Handles token retrieval from Firebase Auth

### 2. API Routes Updated (All now use `withApi` wrapper)

#### Authentication Required Routes:
- ✅ `apps/web/src/app/api/listings/route.ts` - POST (create listing)
- ✅ `apps/web/src/app/api/listings/[id]/route.ts` - PUT, DELETE
- ✅ `apps/web/src/app/api/orders/route.ts` - GET, POST
- ✅ `apps/web/src/app/api/orders/[id]/route.ts` - GET, PATCH
- ✅ `apps/web/src/app/api/carts/route.ts` - GET, POST, PUT, DELETE
- ✅ `apps/web/src/app/api/profile/route.ts` - PUT (GET allows public)
- ✅ `apps/web/src/app/api/payments/create-intent/route.ts` - POST
- ✅ `apps/web/src/app/api/payments/confirm/route.ts` - POST
- ✅ `apps/web/src/app/api/my-listings/route.ts` - GET
- ✅ `apps/web/src/app/api/upload/profile-photo/route.ts` - POST, DELETE
- ✅ `apps/web/src/app/api/upload/listing-photos/route.ts` - POST, DELETE
- ✅ `apps/web/src/app/api/upload/route.ts` - POST, DELETE
- ✅ `apps/web/src/app/api/ai/chat/route.ts` - POST
- ✅ `apps/web/src/app/api/ai/analyze-product/route.ts` - POST

#### Public Routes (requireAuth: false):
- ✅ `apps/web/src/app/api/listings/route.ts` - GET (public listings)
- ✅ `apps/web/src/app/api/listings/[id]/route.ts` - GET (public listing details)
- ✅ `apps/web/src/app/api/profile/route.ts` - GET (public profiles)

### 3. Frontend Files That Need Updates

**IMPORTANT**: The following frontend files still use `x-user-id` headers and need to be updated to use the new `api-client.ts` utilities:

#### Files to Update:
1. `apps/web/src/components/Navigation.tsx` - Cart count fetch
2. `apps/web/src/app/cart/page.tsx` - Cart operations
3. `apps/web/src/app/sell/page.tsx` - Listing creation
4. `apps/web/src/app/listings/[id]/page.tsx` - Listing operations
5. `apps/web/src/app/listings/[id]/edit/page.tsx` - Listing updates
6. `apps/web/src/app/my-listings/page.tsx` - Fetching user listings
7. `apps/web/src/app/profile/page.tsx` - Profile operations
8. `apps/web/src/components/ProfileEditModal.tsx` - Profile updates
9. `apps/web/src/components/CheckoutForm.tsx` - Payment operations
10. `apps/web/src/components/AssistantPage.tsx` - AI chat
11. `apps/web/src/hooks/usePhotoUpload.ts` - Photo uploads
12. `apps/web/src/hooks/useFileUpload.ts` - File uploads
13. All other components making API calls with `x-user-id` header

### 4. Migration Steps for Frontend

For each frontend file that makes API calls:

**Before:**
```typescript
const response = await fetch('/api/endpoint', {
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': currentUser?.uid || '',
  },
  body: JSON.stringify(data),
});
```

**After:**
```typescript
import { apiPost } from '@/lib/api-client';

const response = await apiPost('/api/endpoint', data);
```

Or for custom headers:
```typescript
import { apiRequest } from '@/lib/api-client';

const response = await apiRequest('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data),
  headers: {
    'x-user-email': currentUser?.email || '',
  },
});
```

## Installation Required

Before deploying, install Firebase Admin SDK:
```bash
cd apps/web
npm install firebase-admin
```

## Environment Variables

Add to `.env.local`:
```
FIREBASE_SERVICE_ACCOUNT_KEY=<service-account-json-string>
```

Or use default credentials (for Firebase Cloud Functions/GCP).

## Testing Checklist

- [ ] Install firebase-admin package
- [ ] Set up Firebase Admin credentials
- [ ] Test API routes with valid tokens
- [ ] Test API routes with invalid/missing tokens (should return 401)
- [ ] Update all frontend fetch calls
- [ ] Test complete user flows (login, create listing, checkout, etc.)
- [ ] Verify no `x-user-id` headers are sent from frontend
- [ ] Verify all API routes return 401 for unauthenticated requests

## Security Improvements

1. ✅ **Server-side token verification** - Tokens are now verified on the server
2. ✅ **No client-controlled user IDs** - User ID comes from verified token only
3. ✅ **Prevents impersonation** - Users cannot fake their identity
4. ✅ **Token expiration handling** - Expired tokens automatically rejected
5. ✅ **Consistent auth pattern** - All routes use the same verification method

## Breaking Changes

- All API routes now require `Authorization: Bearer <token>` header instead of `x-user-id`
- Frontend must call `auth.currentUser?.getIdToken()` before making API requests
- Unauthenticated requests to protected routes will return 401

## Next Steps

1. Update all frontend fetch calls to use `api-client.ts`
2. Remove all `x-user-id` header usage from frontend
3. Test thoroughly
4. Deploy to staging
5. Monitor for 401 errors (indicates frontend not sending tokens)

