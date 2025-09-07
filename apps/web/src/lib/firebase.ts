import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD2VWEyMQh1HZ9NhfRRIhlT5Nq9XJXGdfs",
  authDomain: "all-verse-gpt-9c2e1.firebaseapp.com",
  projectId: "all-verse-gpt-9c2e1",
  storageBucket: "all-verse-gpt-9c2e1.firebasestorage.app",
  messagingSenderId: "946851407337",
  appId: "1:946851407337:web:a600142219cfdfa8e19778",
  measurementId: "G-JH266QPZGQ"
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return false;
  }
  
  console.log('Firebase Config Debug:', {
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    appId: firebaseConfig.appId,
    env: typeof window !== 'undefined' ? 'client' : 'server'
  });
  
  const isConfigured = firebaseConfig.apiKey.length > 20 &&
         firebaseConfig.projectId.length > 5 &&
         !firebaseConfig.apiKey.includes('placeholder');
  
  console.log('Firebase is configured:', isConfigured);
  return isConfigured;
};

// Initialize Firebase
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase not properly configured. Please set up your Firebase project.');
  console.warn('Error:', error);
}

export { auth, db, storage, isFirebaseConfigured };
export default app;
