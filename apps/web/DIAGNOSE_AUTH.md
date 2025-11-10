# Authentication Diagnosis Steps

## Quick Check

1. **Open Browser Console (F12) → Console Tab**
   - Look for messages starting with `🔍`, `✅`, `⚠️`, or `❌`
   - These will tell us exactly where the auth flow is breaking

2. **Check Network Tab → my-listings request → Headers**
   - Click on the `my-listings` request (the one with 401)
   - Go to "Headers" tab
   - Scroll to "Request Headers"
   - **Look for `Authorization: Bearer ...`**
   - If it's missing → Token not being sent
   - If it's present → Server can't verify it

3. **Check Server Terminal**
   - Look for messages like:
     - `🔑 Initializing Firebase Admin...`
     - `✅ Firebase Admin initialized`
     - `❌ Firebase Admin initialization failed`
     - `🔍 Verifying token...`
     - `✅ Token verified`
     - `❌ Token verification failed`

## Common Issues

### Issue 1: Token Not Being Sent
**Symptoms:**
- Console shows: `⚠️ No current user found after authStateReady`
- Network tab: No `Authorization` header in request

**Fix:**
- Sign out and sign back in
- Clear browser cache/localStorage
- Check if Firebase Auth is properly configured

### Issue 2: Firebase Admin Not Configured
**Symptoms:**
- Server logs show: `❌ Firebase Admin initialization failed`
- Network tab: `Authorization` header IS present
- Server logs show: `❌ Token verification failed`

**Fix:**
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` to `.env.local`
- Restart dev server

### Issue 3: Auth State Not Persisting
**Symptoms:**
- Console shows: `⚠️ No current user`
- Navigation bar shows "Sign In" button (not profile)
- But you think you're logged in

**Fix:**
- Sign out completely
- Clear browser data (localStorage, cookies)
- Sign in again

## What to Share

Please share:
1. **Console Tab Output** - All messages when you visit `/my-listings`
2. **Network Tab → Headers** - Screenshot of the request headers for `my-listings`
3. **Server Terminal Output** - Any Firebase Admin or token verification messages

