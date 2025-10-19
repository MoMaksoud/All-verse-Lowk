import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  const isConfigured = firebaseConfig.apiKey &&
         firebaseConfig.projectId &&
         firebaseConfig.authDomain &&
         firebaseConfig.appId

  return isConfigured;
};

// Initialize Firebase only if properly configured
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

// Only initialize Firebase if we have valid configuration
if (firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.authDomain && 
    firebaseConfig.appId) {
  try {
    console.log('🔥 Initializing Firebase with config:', {
      apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
      projectId: firebaseConfig.projectId ? '✅ Set' : '❌ Missing',
      authDomain: firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
      storageBucket: firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing',
      appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing'
    });
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log('🔥 Firebase initialized successfully:', {
      app: !!app,
      auth: !!auth,
      db: !!db,
      storage: !!storage
    });
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.error('❌ Firebase config:', firebaseConfig);
  }
} else {
  console.warn('⚠️ Firebase configuration incomplete:', {
    apiKey: !!firebaseConfig.apiKey,
    projectId: !!firebaseConfig.projectId,
    authDomain: !!firebaseConfig.authDomain,
    storageBucket: !!firebaseConfig.storageBucket,
    appId: !!firebaseConfig.appId
  });
}

export { auth, db, storage, isFirebaseConfigured };
export default app;
