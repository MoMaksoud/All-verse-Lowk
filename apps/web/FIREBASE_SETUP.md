# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for your All Verse marketplace application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "all-verse-marketplace")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project dashboard, click on "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click on "Email/Password"
5. Enable the first toggle (Email/Password)
6. Click "Save"

## Step 3: Enable Firestore Database

1. In your Firebase project dashboard, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database (choose closest to your users)
5. Click "Done"

### Firestore Security Rules (Optional)
For production, you'll want to set up proper security rules. For now, test mode allows all reads/writes.

## Step 4: Enable Firebase Storage

1. In your Firebase project dashboard, click on "Storage" in the left sidebar
2. Click "Get started"
3. Choose "Start in test mode" (for development)
4. Select a location for your storage (choose closest to your users)
5. Click "Done"

### Storage Security Rules (Optional)
For production, you'll want to set up proper security rules. For now, test mode allows all uploads/downloads.

## Step 5: Get Your Firebase Configuration

1. In your Firebase project dashboard, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Enter an app nickname (e.g., "All Verse Web")
6. Click "Register app"
7. Copy the Firebase configuration object

## Step 6: Create Environment Variables

1. In your project root (`apps/web/`), create a file called `.env.local`
2. Add the following content with your actual Firebase values:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_actual_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_actual_app_id
```

**Important:** Replace the placeholder values with your actual Firebase configuration values.

## Step 7: Test Authentication, Firestore & Storage

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/signin` or `/signup` in your browser
3. You should now see the authentication forms instead of the setup message
4. Try creating a new account and signing in
5. Go to your profile page and edit your bio/location
6. Upload a profile picture - it will be saved to Firebase Storage
7. Check your Firestore database in the Firebase console - you should see a `profiles` collection with your data
8. Check your Firebase Storage in the console - you should see uploaded profile pictures

## Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"
- Make sure your `.env.local` file is in the correct location (`apps/web/.env.local`)
- Verify that your Firebase API key is correct
- Restart your development server after creating/updating `.env.local`

### Error: "Firebase: Error (auth/operation-not-allowed)"
- Make sure Email/Password authentication is enabled in Firebase Console
- Go to Authentication → Sign-in method → Email/Password and ensure it's enabled

### Environment Variables Not Loading
- Make sure your `.env.local` file is in the `apps/web/` directory
- Restart your development server
- Check that variable names start with `NEXT_PUBLIC_`

## Security Notes

- Never commit your `.env.local` file to version control
- The `.env.local` file is already included in `.gitignore`
- Firebase API keys are safe to expose in client-side code (they're designed for this)

## Why Use Firestore for User Data?

### ✅ **Advantages of Firestore:**
- **Real-time updates**: Changes sync instantly across all devices
- **Offline support**: Works even without internet connection
- **Automatic scaling**: Handles millions of users without configuration
- **Security rules**: Granular control over data access
- **NoSQL flexibility**: Easy to add new fields without migrations
- **Global CDN**: Fast access worldwide
- **Built-in backup**: Automatic data protection

### 🔄 **Data Persistence:**
- **Profile data persists** across browser sessions
- **Real-time sync** between devices
- **Automatic backup** and recovery
- **Scalable** to millions of users

### 🚀 **Future Features You Can Add:**
- Real-time messaging between users
- Live notifications
- Collaborative features
- Offline-first experience
- Advanced search and filtering

## Next Steps

Once Firebase is configured, you can:
- Protect routes using the `ProtectedRoute` component
- Access user data through the `useAuth()` hook
- View real-time profile data in Firestore console
- Implement additional authentication features (password reset, email verification, etc.)
- Add real-time features like live chat or notifications
