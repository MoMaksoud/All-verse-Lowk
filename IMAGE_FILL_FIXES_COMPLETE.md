# Image Fill/Width Conflict - Final Fix

## Critical Error Fixed
**Error:** `Image with src "..." has both "fill" and "style.width" properties. Images with "fill" always use width 100% - it cannot be modified.`

## Root Cause
In `apps/web/src/app/profile/[userId]/page.tsx` line 148, there was an Image component using:
- `fill` prop
- `style={{ width: "auto", height: "auto" }}`

This combination is **forbidden** in Next.js Image component.

---

## Fix Applied

### File: `apps/web/src/app/profile/[userId]/page.tsx`

**Before (❌ Broken):**
```typescript
<div className="w-20 h-20 overflow-hidden rounded-full bg-dark-700">
  {profile.profilePicture ? (
    <Image
      src={normalizeImageSrc(profile.profilePicture)}
      alt={profile.username}
      fill                                              // ❌ Using fill
      className="object-cover"
      style={{ width: "auto", height: "auto" }}        // ❌ With width/height style
      sizes="80px"
    />
  ) : (
    <div className="...">
      {profile.username.charAt(0).toUpperCase()}
    </div>
  )}
</div>
```

**After (✅ Fixed):**
```typescript
<div className="w-20 h-20 overflow-hidden rounded-full bg-dark-700">
  {profile.profilePicture ? (
    <Image
      src={normalizeImageSrc(profile.profilePicture)}
      alt={profile.username}
      width={80}                                         // ✅ Explicit width
      height={80}                                        // ✅ Explicit height
      className="object-cover rounded-full"
      unoptimized
    />
  ) : (
    <div className="...">
      {profile.username.charAt(0).toUpperCase()}
    </div>
  )}
</div>
```

---

## Additional Improvements

### 1. Changed clickable divs to buttons

**Before:**
```typescript
<div onClick={handleProfileClick} className="shrink-0 cursor-pointer">
```

**After:**
```typescript
<button 
  onClick={handleProfileClick}
  className="shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-full"
  type="button"
  aria-label="View profile"
>
```

**Benefits:**
- ✅ Semantic HTML
- ✅ Keyboard accessible
- ✅ Focus indicators
- ✅ Screen reader friendly

---

## Other Errors Explained

### 1. 404 Profile Errors (Expected ✅)
```
Failed to load resource: /api/profile?userId=... 404 (Not Found)
```

**Status:** **Expected behavior**
- These users don't have profiles in the database yet
- The frontend handles this gracefully with fallback to "Marketplace User"
- Not an error - this is normal operation

### 2. 503 Listings Error
```
Failed to load resource: /api/listings?sellerId=...&limit=100 503 (Service Unavailable)
```

**Status:** API/Database issue
- This is a backend error
- Likely Firestore rate limiting or service issue
- Needs backend investigation

### 3. HotReload Warning (Should be fixed ✅)
```
Warning: Cannot update a component (`HotReload`) while rendering a different component (`ForwardRef`)
```

**Status:** **Should be resolved now**
- Was caused by the Image fill/width conflict
- Once the Image is fixed, this warning should disappear

---

## All Image Component Fixes

### Components Fixed:
1. ✅ `ProfilePicture.tsx` - Removed fill, using width/height
2. ✅ `apps/web/src/app/profile/[userId]/page.tsx` - Removed fill+style conflict

### Components Already Correct:
- `ListingCard.tsx` - Using fill correctly (no width overrides)
- `ListingGallery.tsx` - Using fill correctly
- `listings/ListingCard.tsx` - Using fill correctly

---

## Test Results Expected

After this fix, you should see:
- ✅ No "fill and style.width" errors
- ✅ No HotReload render-phase errors  
- ✅ Profile page loads successfully
- ✅ Profile avatar displays correctly (80x80)
- ✅ Clickable avatar and username work

You will still see:
- ⚠️ 404 errors for profiles (expected - users without profiles)
- ⚠️ 503 errors for listings API (backend issue)

---

## Next Steps

1. **Reload the page** - The fix should take effect immediately
2. **Check console** - Should see no more Image errors
3. **Test profile page** - Navigate to a user profile
4. **Verify avatar** - Should display correctly

If 503 errors persist:
- Check Firestore quotas/limits
- Check API logs for errors
- Verify database connection

---

**Status:** ✅ **All Image fill/width conflicts FIXED**
**Files Modified:** 
- `apps/web/src/app/profile/[userId]/page.tsx`
- `apps/web/src/components/ProfilePicture.tsx` (previous fix)

