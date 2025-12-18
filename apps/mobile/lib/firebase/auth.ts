import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await AsyncStorage.setItem('user', JSON.stringify(userCredential.user));
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { user: null, error: error.message };
  }
};

// Sign up with email and password
export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await AsyncStorage.setItem('user', JSON.stringify(userCredential.user));
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return { user: null, error: error.message };
  }
};

// Sign out
export const signOut = async () => {
  try {
    console.log('🟢 Firebase Auth: Starting sign out...');
    console.log('🟢 Firebase Auth: Current user:', auth.currentUser?.email);
    
    await firebaseSignOut(auth);
    console.log('🟢 Firebase Auth: firebaseSignOut completed');
    
    await AsyncStorage.removeItem('user');
    console.log('🟢 Firebase Auth: AsyncStorage cleared');
    
    console.log('🟢 Firebase Auth: Sign out successful');
    return { error: null };
  } catch (error: any) {
    console.error('🔴 Firebase Auth: Sign out error:', error);
    return { error: error.message };
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get ID token
export const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
};

