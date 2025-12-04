# Seller Profile Link Fix

## Issue
User couldn't click on seller usernames to view their full profile and listings.

## Root Cause
The click handlers were using `<div>` elements with `onClick`, which can sometimes be blocked or not register properly. This is not semantically correct for clickable elements.

## Solution Applied

### Changed in `apps/web/src/components/SellerInfo.tsx`:

**Before:**
```typescript
<div 
  onClick={handleProfileClick}
  className="cursor-pointer hover:opacity-80 transition-opacity"
>
  <ProfilePicture ... />
</div>

<h3 
  onClick={handleProfileClick}
  className="..."
>
  {seller?.name}
</h3>
```

**After:**
```typescript
<button
  onClick={(e) => handleProfileClick(e)}
  className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
  aria-label={`View ${seller?.name}'s profile`}
  type="button"
>
  <ProfilePicture ... />
</button>

<button
  onClick={(e) => handleProfileClick(e)}
  className="truncate text-base sm:text-lg font-semibold cursor-pointer hover:text-blue-400 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
  type="button"
>
  {seller?.name}
</button>
```

### Enhanced Handler:
```typescript
const handleProfileClick = (e?: React.MouseEvent) => {
  e?.preventDefault();
  e?.stopPropagation();
  if (seller?.id) {
    console.log('Navigating to profile:', seller.id);
    router.push(`/profile/${seller.id}`);
  } else {
    console.warn('No seller ID available');
  }
};
```

## Improvements

1. ✅ **Semantic HTML** - Using `<button>` instead of clickable `<div>`
2. ✅ **Event Handling** - Added `preventDefault()` and `stopPropagation()` to prevent event bubbling
3. ✅ **Accessibility** - Added `aria-label` for screen readers
4. ✅ **Focus States** - Added `focus:ring` for keyboard navigation
5. ✅ **Debugging** - Added console logs to track navigation
6. ✅ **Type Safety** - Explicit event type parameter

## How It Works

When a user clicks on either:
- The seller's profile picture
- The seller's username

The app will navigate to: `/profile/{sellerId}`

This page (`apps/web/src/app/profile/[userId]/page.tsx`) displays:
- ✅ User's profile information
- ✅ User's bio
- ✅ Member since date
- ✅ All listings by that seller
- ✅ Profile picture

## Testing

1. Go to any listing page (e.g., `/listings/bXa55GIfdF8eLVpH4NSy`)
2. Scroll to the "Seller Information" section
3. Click on the seller's avatar or username
4. You should be navigated to `/profile/{sellerId}`
5. Check browser console for: `Navigating to profile: {sellerId}`

## User Experience

**Before:** Non-clickable text/images that look clickable but don't work
**After:** Fully functional clickable buttons with proper hover states and focus indicators

---

**Status:** ✅ Fixed
**Files Modified:** `apps/web/src/components/SellerInfo.tsx`

