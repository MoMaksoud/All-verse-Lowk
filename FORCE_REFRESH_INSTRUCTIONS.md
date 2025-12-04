# How to Force Refresh and Clear Cache

## The Problem
Your browser has **cached the old code** with the Image error. The files are fixed, but your browser is still running the old version.

---

## 🔥 **Quick Fix - Force Hard Refresh**

### **Option 1: Hard Refresh (Fastest)**

1. **Open the profile page** in your browser
2. **Press one of these key combinations:**

   **Windows/Linux:**
   - `Ctrl + Shift + R`
   - OR `Ctrl + F5`
   - OR `Shift + F5`

   **Mac:**
   - `Cmd + Shift + R`
   - OR `Cmd + Option + R`

3. **Page should reload** with the new code

---

### **Option 2: Clear Cache and Hard Reload (Most Thorough)**

1. **Open Chrome DevTools:**
   - Press `F12` or `Ctrl/Cmd + Shift + I`

2. **Right-click the refresh button** (next to the address bar)

3. **Select "Empty Cache and Hard Reload"**

4. **Wait for page to reload**

---

### **Option 3: Clear Browser Cache Completely**

1. **Press:**
   - Windows/Linux: `Ctrl + Shift + Delete`
   - Mac: `Cmd + Shift + Delete`

2. **Select:**
   - ✅ Cached images and files
   - Time range: "Last hour" or "All time"

3. **Click "Clear data"**

4. **Reload the page** (F5)

---

## 🔍 **How to Verify It Worked**

After hard refresh, check the **Console** (F12):

### ✅ **Should SEE:**
- No Image fill/width errors
- No HotReload warnings
- Profile page loads successfully
- Clean console (except 404s which are normal)

### ⚠️ **Still OK to See:**
- `404 /api/profile?userId=...` (normal - users without profiles)
- `503 /api/listings` (backend issue - separate problem)

---

## 🛠️ **If Still Not Working**

### **Restart Dev Server:**

1. **Stop the dev server** in terminal:
   - Press `Ctrl + C`

2. **Wait 2 seconds**

3. **Restart:**
   ```bash
   pnpm run dev
   ```

4. **Wait for "Ready" message**

5. **Go to browser and hard refresh** (Ctrl+Shift+R)

---

## 📊 **What Was Fixed**

### **File: `apps/web/src/app/profile/[userId]/page.tsx`**

**Before (Cached in Browser):**
```typescript
<Image
  fill                               // ❌ Old code
  style={{ width: "auto" }}          // ❌ Conflict
/>
```

**After (In Files Now):**
```typescript
<Image
  width={80}                         // ✅ New code
  height={80}                        // ✅ Fixed
  className="object-cover rounded-full"
/>
```

---

## 🎯 **Expected Results After Hard Refresh**

1. ✅ Profile page loads
2. ✅ No Image errors in console
3. ✅ Avatar displays correctly (80x80 circle)
4. ✅ Username clickable
5. ⚠️ 404 errors (normal - users without profiles)
6. ⚠️ 503 errors (backend issue - needs separate fix)

---

## 🚨 **If STILL Getting Errors After Hard Refresh**

1. **Close ALL browser tabs** for localhost:3001
2. **Restart dev server:**
   ```bash
   # In terminal:
   Ctrl+C
   pnpm run dev
   ```
3. **Wait for "Ready" message**
4. **Open NEW incognito/private window:**
   - Windows/Linux: `Ctrl + Shift + N`
   - Mac: `Cmd + Shift + N`
5. **Go to:** `http://localhost:3001/profile/GtzQO4YwHFXvReestdPVv5qLmfw2`

---

**TRY THIS NOW:**
1. Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
2. Check console - Image error should be GONE!

---

**If it works:** ✅ You're done!

**If it doesn't work:** Tell me and I'll help restart the dev server.

