# Debugging 401 Unauthorized Errors

## Quick Diagnosis Steps

### 1. Check Browser Console
Look for these messages when making API calls:

**If you see:**
- `⚠️ Firebase auth not initialized` → Firebase client not configured
- `⚠️ No current user found` → User not logged in
- `✅ Auth token retrieved successfully` → Token retrieved (good!)
- `✅ Authorization header added to request` → Token sent (good!)

**If you DON'T see the ✅ messages:**
- The token isn't being retrieved or sent
- Check if you're logged in

### 2. Check Server Logs (Terminal)
Look for these messages when API routes are called:

**Firebase Admin Initialization:**
- `🔑 Initializing Firebase Admin with service account...` → Using service account
- `⚠️ No FIREBASE_SERVICE_ACCOUNT_KEY found, using default credentials...` → Using default credentials
- `✅ Firebase Admin initialized` → Admin SDK ready (good!)
- `❌ Firebase Admin initialization failed` → **PROBLEM: Admin not configured**

**Token Verification:**
- `🔍 Verifying token (length: XXX)` → Token received
- `✅ Token verified successfully for user: XXX` → Token valid (good!)
- `❌ Token verification failed` → **PROBLEM: Token invalid or Admin not configured**

### 3. Common Issues & Fixes

#### Issue 1: "Missing or invalid Authorization header"
**Cause:** Token not being sent from frontend
**Fix:** 
- Check browser console for token retrieval errors
- Ensure user is logged in
- Check `api-client.ts` is being used

#### Issue 2: "Firebase Admin initialization failed"
**Cause:** Missing `FIREBASE_SERVICE_ACCOUNT_KEY` or invalid format
**Fix:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Copy the JSON
5. Add to `.env.local`:
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
   ```
6. Restart dev server

#### Issue 3: "Invalid or expired token"
**Cause:** Token expired or Firebase Admin can't verify it
**Fix:**
- Check Firebase Admin is initialized (see server logs)
- Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` is correct
- Try logging out and back in

#### Issue 4: User not logged in
**Cause:** `currentUser` is null
**Fix:**
- Sign in to the application
- Check `AuthContext` is working
- Verify Firebase Auth is configured

## Testing Checklist

1. **Check if logged in:**
   - Open browser console
   - Type: `firebase.auth().currentUser`
   - Should return user object (not null)

2. **Check token retrieval:**
   - Open browser console
   - Look for "✅ Auth token retrieved successfully" when making API calls

3. **Check server logs:**
   - Look for "✅ Firebase Admin initialized"
   - Look for "✅ Token verified successfully"

4. **Check Network tab:**
   - Open DevTools → Network
   - Find the failed request (401)
   - Check Request Headers
   - Should see: `Authorization: Bearer <token>`
   - If missing → token not being sent

## Environment Variables Required

Make sure `.env.local` has:

```bash
# Firebase Client (required)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (required for token verification)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

## Quick Test

Run this in browser console after logging in:
```javascript
import { auth } from '@/lib/firebase';
await auth.authStateReady();
const user = auth.currentUser;
if (user) {
  const token = await user.getIdToken();
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('Token length:', token.length);
} else {
  console.log('No user logged in');
}
```

