import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import auth functions separately to avoid initialization issues
import { 
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  Auth,
  getReactNativePersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔵 Firebase: Initializing app...');
console.log('🔵 Platform:', Platform.OS);

// Initialize Firebase App
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔵 Firebase: App initialized');
} else {
  app = getApp();
  console.log('🔵 Firebase: Using existing app');
}

// Initialize Auth - React Native requires special handling
let auth: Auth;

if (Platform.OS === 'web') {
  // Web: simple initialization
  console.log('🔵 Firebase: Initializing auth for web...');
  try {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
    console.log('🔵 Firebase: Web auth initialized');
  } catch (error: any) {
    if (error?.code === 'auth/already-initialized') {
      console.log('🔵 Firebase: Auth already initialized, getting instance');
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
} else {
  console.log('🔵 Firebase: Initializing auth for React Native...');
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    console.log('🔵 Firebase: React Native auth initialized');
  } catch (error: any) {
    if (error?.code === 'auth/already-initialized') {
      console.log('🔵 Firebase: Auth already initialized, getting instance');
      auth = getAuth(app);
    } else {
      console.error('🔴 Firebase: Auth initialization error:', error);
      throw error;
    }
  }
}

console.log('🔵 Firebase: Initializing Firestore and Storage...');
const db = getFirestore(app);
const storage = getStorage(app);
console.log('🔵 Firebase: All services initialized successfully');

export { app, auth, db, storage };