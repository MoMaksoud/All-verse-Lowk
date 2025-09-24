// Lazy Firebase initialization for client-side components
// This reduces the initial bundle size by only loading Firebase when needed

let firebasePromise: Promise<any> | null = null;

export const getFirebaseLazy = async () => {
  if (firebasePromise) {
    return firebasePromise;
  }

  firebasePromise = import('@/lib/firebase').then(({ auth, db, storage, isFirebaseConfigured }) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase not configured');
    }
    return { auth, db, storage };
  });

  return firebasePromise;
};

// Lazy auth functions
export const getAuthLazy = async () => {
  const { auth } = await getFirebaseLazy();
  return auth;
};

// Lazy firestore functions
export const getFirestoreLazy = async () => {
  const { db } = await getFirebaseLazy();
  return db;
};

// Lazy storage functions
export const getStorageLazy = async () => {
  const { storage } = await getFirebaseLazy();
  return storage;
};
