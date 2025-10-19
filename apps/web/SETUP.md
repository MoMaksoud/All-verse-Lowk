# Environment Setup Instructions

## Required Environment Variables

To fix the Internal Server Error, you need to create a `.env.local` file in the `apps/web` directory with the following environment variables:

### 1. Firebase Configuration
Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com) and get these values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

### 2. Google Gemini AI API Key
Get this from [Google AI Studio](https://makersuite.google.com/app/apikey):

```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Optional: Google Maps API Key
Get this from [Google Cloud Console](https://console.cloud.google.com):

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 4. Optional: Stripe Configuration
Get these from your [Stripe dashboard](https://dashboard.stripe.com):

```bash
STRIPE_SECRET_KEY=your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

## Steps to Fix the Error

1. **Create the environment file:**
   ```bash
   cd apps/web
   touch .env.local
   ```

2. **Add the required variables** to `.env.local` with your actual values

3. **Restart the development server:**
   ```bash
   pnpm dev
   ```

## What Was Fixed

✅ **Dependency Issues**: Cleaned up node_modules and reinstalled packages using pnpm  
✅ **Missing Package**: Added @next/bundle-analyzer dependency  
✅ **Monorepo Setup**: Properly configured workspace packages  
✅ **Server Status**: Development server is now running on port 3000  

The 500 Internal Server Error was caused by missing environment variables and dependency conflicts. Once you add the required environment variables, the application should work properly.
