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
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  sendEmailVerification
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { ProfileService } from '@/lib/firestore';

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  signupWithPhone: (phoneNumber: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  loginWithPhone: (phoneNumber: string) => Promise<void>;
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

  // Create user profile in Firestore after successful authentication
  const createUserProfile = async (user: User, displayName: string, phoneNumber?: string) => {
    try {
      await ProfileService.createUserProfile(user.uid, {
        displayName,
        email: user.email || undefined,
        phoneNumber: phoneNumber || user.phoneNumber || undefined,
        photoURL: user.photoURL || undefined,
      });
      console.log('User profile created successfully in Firestore');
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Don't throw error here as user is already authenticated
    }
  };

  async function signup(email: string, password: string, displayName: string) {
    console.log('🔍 Signup attempt:', { email, displayName, auth: !!auth, isConfigured });
    
    if (!auth || !isConfigured) {
      console.error('❌ Firebase not configured:', { auth: !!auth, isConfigured });
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    
    try {
      console.log('Creating user account...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created successfully:', userCredential.user.uid);
      
      console.log('Updating profile...');
      await updateProfile(userCredential.user, {
        displayName: displayName,
      });
      console.log('Profile updated successfully');
      
      // Send email verification
      console.log('Sending email verification...');
      await sendEmailVerification(userCredential.user);
      console.log('Email verification sent successfully');
      
      // Don't create profile automatically - let the user fill out the comprehensive form
      // The profile will be created when they submit the ProfileSetupForm
    } catch (error: any) {
      console.error('🚨 SIGNUP ERROR DETAILS:');
      console.error('Full error object:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check Firebase auth state
      console.error('Auth object:', auth);
      console.error('Auth current user:', auth?.currentUser);
      
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
        console.error('Unknown error code:', error.code);
        throw new Error(`Account creation failed: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async function signupWithPhone(phoneNumber: string, displayName: string) {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    
    // Note: Phone authentication requires additional setup with reCAPTCHA
    // This is a placeholder implementation - you'll need to implement the full flow
    throw new Error('Phone authentication requires additional setup. Please use email authentication for now.');
  }

  function login(email: string, password: string) {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithPhone(phoneNumber: string) {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    
    // Note: Phone authentication requires additional setup with reCAPTCHA
    // This is a placeholder implementation - you'll need to implement the full flow
    throw new Error('Phone authentication requires additional setup. Please use email authentication for now.');
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
          console.error('Error loading user profile:', error);
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
    signupWithPhone,
    login,
    loginWithPhone,
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
