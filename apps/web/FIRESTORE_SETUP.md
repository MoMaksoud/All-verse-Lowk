# Firestore Configuration Guide

This guide will help you set up Firestore to properly link user data to Firebase users.

## 🔥 Firestore Setup Steps

### 1. Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`all-verse-gpt`)
3. Click **"Firestore Database"** in the left sidebar
4. Click **"Create database"**
5. Choose **"Start in test mode"** (for development)
6. Select a location (choose closest to your users)
7. Click **"Done"**

### 2. Verify Your Firebase Config

Your Firebase config in `apps/web/src/lib/firebase.ts` should already include Firestore:

```typescript
import { getFirestore } from 'firebase/firestore';

// Firestore is already initialized
export const db = getFirestore(app);
```

## 🔗 How User Data Linking Works

### **Each Firebase User = Unique Firestore Document**

When a user signs in, their Firebase UID becomes the document ID in Firestore:

```
Firestore Collection: "profiles"
├── Document ID: "firebase-user-uid-1"
│   ├── bio: "User 1's bio"
│   ├── location: "San Francisco, CA"
│   └── rating: 4.5
├── Document ID: "firebase-user-uid-2"
│   ├── bio: "User 2's bio"
│   ├── location: "New York, NY"
│   └── rating: 4.8
```

### **Data Flow:**

1. **User signs in** → Firebase Auth provides unique UID
2. **Profile page loads** → Sends UID to API (`x-user-id` header)
3. **API creates/fetches** → Firestore document with UID as document ID
4. **Data persists** → Each user has separate profile data

## 🧪 Testing User Data Linking

### **Test Page Available:**
Visit `/test-profiles` to see how user data linking works:

1. **Sign in** with your Firebase account
2. **Go to** `/test-profiles`
3. **See your Firebase UID** displayed
4. **Click "Create Test Profile"** to save data to Firestore
5. **Sign out and sign in with different account** - you'll see different data

### **Manual Testing:**

1. **Sign in** with Account A
2. **Edit profile** (bio, location)
3. **Sign out**
4. **Sign in** with Account B
5. **Check profile** - should be empty/default
6. **Sign back in** with Account A
7. **Check profile** - your data should still be there!

## 🔍 Viewing Data in Firestore Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **"Firestore Database"**
4. You should see a **"profiles"** collection
5. Each document ID is a Firebase user UID
6. Click on documents to see user data

## 🚀 Production Considerations

### **Security Rules (For Later):**

When you're ready for production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### **Environment Variables:**

For production, move your Firebase config to environment variables:

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## ✅ Verification Checklist

- [ ] Firestore database created in Firebase Console
- [ ] Firebase config includes Firestore (`getFirestore`)
- [ ] Profile API uses Firestore (`ProfileService`)
- [ ] Profile page sends user UID in headers
- [ ] Test page (`/test-profiles`) works
- [ ] Different users have separate profile data
- [ ] Data persists across browser sessions
- [ ] Data visible in Firestore Console

## 🎯 Benefits You'll See

- ✅ **Separate data per user** - Each Firebase account has its own profile
- ✅ **Persistent storage** - Data survives browser refreshes
- ✅ **Real-time sync** - Changes appear instantly
- ✅ **Scalable** - Handles millions of users
- ✅ **Secure** - Each user can only access their own data
- ✅ **Offline support** - Works without internet (with sync)

Your user data is now properly linked to Firebase users and stored in Firestore! 🎉
