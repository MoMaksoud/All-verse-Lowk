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
         firebaseConfig.appId &&
         firebaseConfig.apiKey.length > 20 &&
         firebaseConfig.projectId.length > 5 &&
         !firebaseConfig.apiKey.includes('placeholder') &&
         !firebaseConfig.apiKey.includes('your_') &&
         firebaseConfig.apiKey.startsWith('AIza');
  
  // Log configuration status for debugging
  console.log('🔍 Firebase Configuration Check:');
  console.log('API Key:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'Missing');
  console.log('Auth Domain:', firebaseConfig.authDomain);
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('App ID:', firebaseConfig.appId);
  console.log('Is Configured:', isConfigured);
  
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
    firebaseConfig.appId &&
    !firebaseConfig.apiKey.includes('placeholder') &&
    !firebaseConfig.apiKey.includes('your_firebase')) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
}

export { auth, db, storage, isFirebaseConfigured };
export default app;
