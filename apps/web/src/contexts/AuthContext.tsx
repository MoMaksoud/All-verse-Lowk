'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  loading: boolean;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured();

  function signup(email: string, password: string, displayName: string) {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    return createUserWithEmailAndPassword(auth, email, password).then((userCredential) => {
      return updateProfile(userCredential.user, {
        displayName: displayName,
      });
    });
  }

  function login(email: string, password: string) {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    return signOut(auth);
  }

  useEffect(() => {
    if (!auth || !isConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [isConfigured]);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    loading,
    isConfigured,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
