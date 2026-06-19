import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  User,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sign in with a Google id_token (obtained via expo-auth-session)
export const signInWithGoogleCredential = async (idToken: string) => {
  if (!auth) {
    return { user: null, error: 'Firebase is not configured.' };
  }
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    await AsyncStorage.setItem('user', JSON.stringify(userCredential.user));
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  if (!auth) {
    return { user: null, error: 'Firebase is not configured. Please check your environment.' };
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await AsyncStorage.setItem('user', JSON.stringify(userCredential.user));
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Sign up with email and password
export const signUp = async (email: string, password: string) => {
  if (!auth) {
    return { user: null, error: 'Firebase is not configured. Please check your environment.' };
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await AsyncStorage.setItem('user', JSON.stringify(userCredential.user));
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Sign out
export const signOut = async () => {
  if (!auth) {
    await AsyncStorage.removeItem('user');
    return { error: null };
  }
  try {
    await firebaseSignOut(auth);
    await AsyncStorage.removeItem('user');
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth?.currentUser ?? null;
};

// Send Firebase email verification
export const sendFirebaseVerificationEmail = async () => {
  if (!auth?.currentUser) return { error: 'No user logged in' };
  try {
    await sendEmailVerification(auth.currentUser);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Reload current user to refresh emailVerified status
export const reloadCurrentUser = async () => {
  if (!auth?.currentUser) return;
  await auth.currentUser.reload();
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// Get ID token (force refresh to ensure it's valid)
export const getIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  try {
    const token = await user.getIdToken(forceRefresh);
    return token;
  } catch (error: any) {
    return null;
  }
};
