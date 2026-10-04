import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;
let adminStorage: Storage | null = null;

// Initialize Firebase Admin SDK
function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    adminAuth = getAuth(adminApp);
    adminFirestore = getFirestore(adminApp);
    const storage = getStorage(adminApp);
    adminStorage = storage;
    return adminApp;
  }

  // Initialize with service account or default credentials
  try {
    // Local emulator mode: no credentials needed; must match the project seeded by scripts/seed-local.mjs
    const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';
    if (useEmulator) {
      process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9099';
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= 'localhost:9199';
    }
    const serviceAccount = useEmulator ? undefined : process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = useEmulator ? 'demo-allverse' : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (serviceAccount) {
      console.log('🔑 Initializing Firebase Admin with service account...');
      // Parse service account JSON if provided as string
      let serviceAccountJson;
      try {
        serviceAccountJson = typeof serviceAccount === 'string' 
          ? JSON.parse(serviceAccount) 
          : serviceAccount;
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON');
        console.error('❌ To fix: Get service account key from Firebase Console → Project Settings → Service Accounts');
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
      }
      
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || (projectId || serviceAccountJson.project_id ? `${projectId || serviceAccountJson.project_id}.appspot.com` : undefined);
      
      adminApp = initializeApp({
        credential: cert(serviceAccountJson),
        projectId: projectId || serviceAccountJson.project_id,
        storageBucket: storageBucket,
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      console.log('⚠️ No FIREBASE_SERVICE_ACCOUNT_KEY found, attempting default credentials...');
      if (!projectId) {
        console.error('❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing');
        console.error('❌ To fix: Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local');
        console.error('❌ Get it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
        throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required when using default credentials');
      }
      // Use default credentials (for Firebase Cloud Functions or GCP)
      try {
        const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
        
        adminApp = initializeApp({
          projectId: projectId,
          storageBucket: storageBucket,
        });
        console.log('✅ Firebase Admin initialized with default credentials');
      } catch (defaultError) {
        console.error('❌ Default credentials failed. You need FIREBASE_SERVICE_ACCOUNT_KEY for local development.');
        console.error('❌ Get it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
        throw defaultError;
      }
    }

    adminAuth = getAuth(adminApp);
    adminFirestore = getFirestore(adminApp);
    const storage = getStorage(adminApp);
    adminStorage = storage;
    return adminApp;
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error?.message || error);
    console.error('❌ Make sure FIREBASE_SERVICE_ACCOUNT_KEY is set in .env.local');
    console.error('❌ Get service account key from: Firebase Console → Project Settings → Service Accounts');
    throw new Error(`Firebase Admin initialization failed: ${error?.message || 'Unknown error'}`);
  }
}

export function getAdminAuth(): Auth | null {
  if (!adminAuth) {
    try {
      getAdminApp();
    } catch (error) {
      console.error('❌ Firebase Admin Auth not available:', error instanceof Error ? error.message : error);
      return null;
    }
  }
  return adminAuth;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    try {
      getAdminApp();
    } catch (error: any) {
      console.error('❌ Failed to initialize Admin Firestore:', error?.message || error);
      throw new Error(`Firebase Admin Firestore initialization failed: ${error?.message || 'Unknown error'}`);
    }
  }
  if (!adminFirestore) {
    throw new Error('Firebase Admin Firestore is not initialized');
  }
  return adminFirestore;
}

export function getAdminStorage(): Storage {
  if (!adminStorage) {
    try {
      const app = getAdminApp();
      adminStorage = getStorage(app);
    } catch (error: any) {
      console.error('❌ Failed to initialize Admin Storage:', error?.message || error);
      throw new Error(`Firebase Admin Storage initialization failed: ${error?.message || 'Unknown error'}`);
    }
  }
  if (!adminStorage) {
    throw new Error('Firebase Admin Storage is not initialized');
  }
  return adminStorage;
}

export async function verifyIdToken(token: string): Promise<{ uid: string; [key: string]: any }> {
  try {
    const auth = getAdminAuth();
    if (!auth) {
      throw new Error('Firebase Admin SDK is not configured. Please set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
    }
    const decodedToken = await auth.verifyIdToken(token);
    console.log('✅ Token verified successfully for user:', decodedToken.uid);
    return decodedToken;
  } catch (error: any) {
    console.error('❌ Token verification failed:', error?.message || error);
    console.error('❌ Error code:', error?.code);
    console.error('❌ Error details:', error);
    throw new Error(`Invalid or expired token: ${error?.message || 'Unknown error'}`);
  }
}

