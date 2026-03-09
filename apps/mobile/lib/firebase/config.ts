import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function initFirebase(): void {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    if (!app) {
      throw new Error('Firebase app not initialized');
    }

    if (Platform.OS === 'web') {
      try {
        auth = initializeAuth(app, {
          persistence: browserLocalPersistence,
        });
      } catch (error: any) {
        if (error?.code === 'auth/already-initialized') {
          auth = getAuth(app);
        } else {
          throw error;
        }
      }
    } else {
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch (error: any) {
        if (error?.code === 'auth/already-initialized') {
          auth = getAuth(app);
        } else {
          throw error;
        }
      }
    }

    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    if (__DEV__) {
      console.error('[Firebase] Initialization failed:', error);
    }
    app = null;
    auth = null;
    db = null;
    storage = null;
  }
}

initFirebase();

export { app, auth, db, storage };
