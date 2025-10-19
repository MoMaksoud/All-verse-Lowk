'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  getAuth, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { ProfileService } from '@/lib/firestore';

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  loading: boolean;
  isConfigured: boolean;
  userProfile: any | null;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = !!isFirebaseConfigured();

  async function signup(email: string, password: string, displayName: string) {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: displayName,
      });
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Don't create profile automatically - let the user fill out the comprehensive form
      // The profile will be created when they submit the ProfileSetupForm
    } catch (error: any) {
      // Provide more specific error messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please try signing in instead.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email/password accounts are not enabled. Please contact support.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else {
        throw new Error(`Account creation failed: ${error.message || 'Unknown error'}`);
      }
    }
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
    setUserProfile(null);
    return signOut(auth);
  }

  useEffect(() => {
    if (!auth || !isConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // Load user profile from Firestore if user is authenticated
      if (user) {
        try {
          const profile = await ProfileService.getProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [isConfigured]);

  const value = useMemo(() => ({
    currentUser,
    signup,
    login,
    logout,
    loading,
    isConfigured,
    userProfile,
    isEmailVerified: currentUser?.emailVerified || false,
  }), [currentUser, loading, userProfile, isConfigured]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
