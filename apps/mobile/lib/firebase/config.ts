import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
// These should match your web app's Firebase config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 
    (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? 
      `${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com` : 
      undefined),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate Firebase configuration
const isFirebaseConfigured = () => {
  const required = [
    firebaseConfig.apiKey,
    firebaseConfig.projectId,
    firebaseConfig.authDomain,
    firebaseConfig.appId,
  ];
  
  const missing = [];
  if (!firebaseConfig.apiKey) missing.push('EXPO_PUBLIC_FIREBASE_API_KEY');
  if (!firebaseConfig.projectId) missing.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.authDomain) missing.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.appId) missing.push('EXPO_PUBLIC_FIREBASE_APP_ID');
  
  if (missing.length > 0) {
    console.error('❌ Missing Firebase environment variables:', missing.join(', '));
    console.error('💡 Run: cd apps/mobile && node scripts/convert-env.js');
    return false;
  }
  
  return true;
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
  // Check if app is already initialized
  if (getApps().length === 0) {
    // Validate configuration before initializing
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
    }
    
    console.log('🔥 Initializing Firebase for React Native...');
    app = initializeApp(firebaseConfig);
    
    // Initialize Auth - React Native uses AsyncStorage by default
    auth = getAuth(app);
    
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log('✅ Firebase initialized successfully');
  } else {
    // Use existing app
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log('✅ Using existing Firebase app');
  }
} catch (error: any) {
  console.error('❌ Firebase initialization failed:', error);
  if (error?.code === 'auth/invalid-api-key') {
    console.error('💡 Your Firebase API key is invalid or missing.');
    console.error('💡 Make sure you have run: cd apps/mobile && node scripts/convert-env.js');
  }
  throw error;
}

export { auth, db, storage };
export default app;

