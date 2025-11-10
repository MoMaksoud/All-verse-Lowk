import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

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
    return adminApp;
  }

  // Initialize with service account or default credentials
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
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
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
      }
      
      adminApp = initializeApp({
        credential: cert(serviceAccountJson),
        projectId: projectId || serviceAccountJson.project_id,
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      console.log('⚠️ No FIREBASE_SERVICE_ACCOUNT_KEY found, using default credentials...');
      if (!projectId) {
        throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required when using default credentials');
      }
      // Use default credentials (for Firebase Cloud Functions or GCP)
      adminApp = initializeApp({
        projectId: projectId,
      });
      console.log('✅ Firebase Admin initialized with default credentials');
    }

    adminAuth = getAuth(adminApp);
    return adminApp;
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error?.message || error);
    console.error('❌ Make sure FIREBASE_SERVICE_ACCOUNT_KEY or default credentials are configured');
    throw new Error(`Firebase Admin initialization failed: ${error?.message || 'Unknown error'}`);
  }
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    getAdminApp();
  }
  return adminAuth!;
}

export async function verifyIdToken(token: string): Promise<{ uid: string; [key: string]: any }> {
  try {
    const auth = getAdminAuth();
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

