# Complete Firebase Setup Guide

This guide will help you set up Firebase Authentication and Firestore to make your marketplace fully functional with real user data.

## 🚀 Quick Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "all-verse-marketplace")
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Optionally enable **Phone** provider for phone authentication
4. Save changes

### 3. Enable Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (we'll secure it later)
3. Select a location close to your users
4. Create database

### 4. Enable Storage
1. Go to **Storage** → **Get started**
2. Choose **Start in test mode** (we'll secure it later)
3. Select a location close to your users
4. Create storage bucket

### 5. Get Firebase Configuration
1. Go to **Project Settings** → **General**
2. Scroll to "Your apps" section
3. Click **Add app** → **Web app**
4. Register app with a nickname (e.g., "All Verse Web")
5. Copy the configuration object

### 6. Configure Environment Variables
1. Create `.env.local` file in the `apps/web` directory:
```bash
cp env.example .env.local
```

2. Update `.env.local` with your Firebase config:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 7. Deploy Security Rules

#### Firestore Rules
1. Go to **Firestore Database** → **Rules**
2. Replace the default rules with the content from `firestore.rules`:
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Allow public read access for other users' profiles (for public profile pages)
      allow read: if request.auth != null;
    }

    // Users can read all active listings
    match /listings/{listingId} {
      allow read: if resource.data.status == 'active';
      // Users can create listings
      allow create: if request.auth != null && 
                      request.auth.uid == resource.data.sellerId;
      // Users can update their own listings
      allow update: if request.auth != null && 
                       request.auth.uid == resource.data.sellerId;
      // Users can delete their own listings
      allow delete: if request.auth != null && 
                       request.auth.uid == resource.data.sellerId;
    }

    // Conversations - users can only access conversations they're part of
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
                           (request.auth.uid == resource.data.buyerId || 
                            request.auth.uid == resource.data.sellerId);
      allow create: if request.auth != null && 
                        request.auth.uid == resource.data.buyerId;
    }

    // Messages - users can only access messages in conversations they're part of
    match /messages/{messageId} {
      allow read, write: if request.auth != null && 
                           exists(/databases/$(database)/documents/conversations/$(resource.data.conversationId)) &&
                           (request.auth.uid == get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.buyerId ||
                            request.auth.uid == get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.sellerId);
      allow create: if request.auth != null && 
                        request.auth.uid == resource.data.senderId &&
                        exists(/databases/$(database)/documents/conversations/$(resource.data.conversationId)) &&
                        (request.auth.uid == get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.buyerId ||
                         request.auth.uid == get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.sellerId);
    }

    // Profile photos - users can manage their own photos
    match /profilePhotos/{photoId} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                        request.auth.uid == resource.data.userId;
    }

    // Listing photos - users can manage photos for their own listings
    match /listingPhotos/{photoId} {
      allow read, write: if request.auth != null && 
                           exists(/databases/$(database)/documents/listings/$(resource.data.listingId)) &&
                           request.auth.uid == get(/databases/$(database)/documents/listings/$(resource.data.listingId)).data.sellerId;
      allow create: if request.auth != null && 
                        exists(/databases/$(database)/documents/listings/$(resource.data.listingId)) &&
                        request.auth.uid == get(/databases/$(database)/documents/listings/$(resource.data.listingId)).data.sellerId;
    }

    // Default deny rule for any other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
3. Click **Publish**

#### Storage Rules
1. Go to **Storage** → **Rules**
2. Replace the default rules with the content from `storage.rules`:
```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Profile pictures - users can upload and manage their own profile pictures
    match /profile-pictures/{userId}/{fileName} {
      allow read: if true; // Public read access for profile pictures
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Listing photos - users can upload photos for their own listings
    match /listing-photos/{listingId}/{fileName} {
      allow read: if true; // Public read access for listing photos
      allow write: if request.auth != null && 
                      exists(/databases/(default)/documents/listings/$(listingId)) &&
                      request.auth.uid == get(/databases/(default)/documents/listings/$(listingId)).data.sellerId;
    }

    // Temporary uploads - users can upload temporary files
    match /temp/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Default deny rule for any other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```
3. Click **Publish**

## 🎉 What's Now Working

After completing this setup, your marketplace will have:

### ✅ Real Authentication
- Users can sign up with email/password
- User profiles are automatically created in Firestore
- Secure authentication with Firebase Auth

### ✅ Real Data Storage
- User profiles stored in Firestore
- Listings stored in Firestore
- Messages and conversations stored in Firestore
- Profile and listing photos stored in Firebase Storage

### ✅ Secure Access Control
- Users can only access their own data
- Public profiles are readable by authenticated users
- Listings are publicly readable when active
- Messages are only accessible by conversation participants

### ✅ Full Functionality
- Create and manage listings
- Send and receive messages
- Upload profile and listing photos
- Browse and search listings
- View user profiles

## 🔧 Testing Your Setup

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test user registration:**
   - Go to `/signup`
   - Create a new account
   - Check Firebase Console → Authentication to see the new user

3. **Test profile creation:**
   - After signup, check Firestore → profiles collection
   - You should see a new profile document

4. **Test listing creation:**
   - Go to `/sell`
   - Create a new listing
   - Check Firestore → listings collection

5. **Test messaging:**
   - Go to `/messages`
   - Start a conversation
   - Check Firestore → conversations and messages collections

## 🚨 Troubleshooting

### Common Issues:

1. **"Firebase is not properly configured"**
   - Check your `.env.local` file has the correct Firebase config
   - Restart your development server after adding environment variables

2. **Permission denied errors**
   - Make sure you've deployed the security rules
   - Check that the user is authenticated

3. **Storage upload failures**
   - Verify Storage rules are deployed
   - Check that the user is authenticated
   - Ensure the file path matches the rules

4. **Profile not found errors**
   - Check that profiles are being created during signup
   - Verify the ProfileService is working correctly

## 📱 Phone Authentication (Optional)

To enable phone authentication:

1. In Firebase Console → Authentication → Sign-in method
2. Enable **Phone** provider
3. Add your domain to authorized domains
4. The phone authentication methods are already implemented in the code but require additional setup

## 🔒 Security Best Practices

1. **Never expose sensitive data** in client-side code
2. **Use security rules** to control access to data
3. **Validate data** on both client and server
4. **Monitor usage** in Firebase Console
5. **Regular security audits** of your rules

## 📊 Monitoring

Use Firebase Console to monitor:
- **Authentication**: User signups, sign-ins, and errors
- **Firestore**: Database usage, reads, writes, and errors
- **Storage**: File uploads, downloads, and errors
- **Performance**: App performance metrics

Your marketplace is now fully functional with real Firebase data! 🎉
