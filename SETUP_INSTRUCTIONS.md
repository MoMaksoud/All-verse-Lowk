# Setup Instructions for Critical Fixes

## ✅ What Was Fixed

1. **Firestore Security Rules** - Complete rules for all collections
2. **Authentication Error Handling** - Better debugging and error messages
3. **Seller Payouts** - Full Stripe Connect integration

## 🔧 Required Setup

### 1. Firebase Admin SDK Configuration

**Get Service Account Key:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Save the JSON file

**Add to `.env.local`:**
```bash
# In apps/web/.env.local
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

**Important:** The entire JSON must be on one line, wrapped in single quotes.

### 2. Stripe Connect Setup

**Enable Stripe Connect:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Connect**
3. Enable **Express accounts**
4. Configure your platform settings

**Add to `.env.local`:**
```bash
STRIPE_SECRET_KEY=sk_test_...  # or sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Deploy Firestore Rules

**Deploy the updated security rules:**
```bash
firebase deploy --only firestore:rules
```

Or manually copy `apps/web/firestore.rules` to Firebase Console → Firestore → Rules

## 🧪 Testing

### Test Authentication
1. Restart dev server: `npm run dev`
2. Check server logs for: `✅ Firebase Admin initialized`
3. Sign in to the app
4. Visit `/my-listings` - should work without 401 errors

### Test Seller Payouts
1. Sign in as a seller
2. Go to `/sales` page
3. Click **"Connect Stripe"** button
4. Complete Stripe onboarding
5. Create a test listing
6. Make a test purchase (use Stripe test cards)
7. Check seller's Stripe dashboard for transfer

## 📋 Summary of Changes

### Files Modified:
- `apps/web/firestore.rules` - Added security rules for orders, payments, carts, notifications
- `apps/web/src/lib/firebase-admin.ts` - Improved error messages
- `apps/web/src/lib/stripe.ts` - Added Stripe Connect functions
- `apps/web/src/lib/firestore.ts` - Added Stripe Connect fields to profile
- `apps/web/src/app/api/webhooks/stripe/route.ts` - Added seller payout transfers
- `apps/web/src/app/sales/page.tsx` - Added Stripe Connect UI

### Files Created:
- `apps/web/src/app/api/stripe/connect/create-account/route.ts`
- `apps/web/src/app/api/stripe/connect/account-link/route.ts`
- `apps/web/src/app/api/stripe/connect/account-status/route.ts`

## ⚠️ Important Notes

- **Platform Fee**: Currently 10% (configurable in `calculateSellerPayout`)
- **Test Mode**: Use Stripe test mode for development
- **Pending Payouts**: Sellers without Connect accounts will have pending payouts (logged but not stored)
- **Security**: Firestore rules allow authenticated reads for orders (filtered client-side for sellers)

