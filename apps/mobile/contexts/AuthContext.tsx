import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase/config';
import {
  onAuthStateChange,
  signOut as firebaseSignOut,
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  sendFirebaseVerificationEmail,
  reloadCurrentUser,
} from '../lib/firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  hasProfile: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  sendVerificationEmail: () => Promise<{ error: string | null }>;
  reloadUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

async function checkHasProfile(userId: string): Promise<boolean> {
  try {
    if (!db) return false;
    const snap = await getDoc(doc(db, 'profiles', userId));
    return snap.exists() && !!snap.data()?.username;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) { setHasProfile(false); return; }
    setProfileLoading(true);
    setHasProfile(await checkHasProfile(uid));
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user?.uid) {
        setProfileLoading(true);
        setHasProfile(await checkHasProfile(user.uid));
        setProfileLoading(false);
      } else {
        setHasProfile(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) =>
    firebaseSignIn(email, password);

  const signUp = async (email: string, password: string) =>
    firebaseSignUp(email, password);

  const signOut = async () => {
    try {
      const result = await firebaseSignOut();
      if (!result.error) {
        setCurrentUser(null);
        setHasProfile(false);
      }
      return result;
    } catch (error) {
      return { error: String(error) };
    }
  };

  const sendVerificationEmail = async () => sendFirebaseVerificationEmail();

  // Reload Firebase user so emailVerified updates in React state
  const reloadUser = async () => {
    await reloadCurrentUser();
    const updated = auth?.currentUser ?? null;
    // Force re-render by spreading to new object reference
    setCurrentUser(updated ? Object.assign(Object.create(Object.getPrototypeOf(updated)), updated) : null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      hasProfile,
      profileLoading,
      signIn,
      signUp,
      signOut,
      sendVerificationEmail,
      reloadUser,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
