'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  getAuth, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { ProfileService } from '@/lib/firestore';
import { firestoreServices } from '@/lib/services/firestore';

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  loading: boolean;
  isConfigured: boolean;
  userProfile: any | null;
  userProfilePic: string | null; // From users collection profilePic field
  isEmailVerified: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userProfilePic, setUserProfilePic] = useState<string | null>(null); // From users collection profilePic field
  const [loading, setLoading] = useState(true);
  const isConfigured = !!isFirebaseConfigured();

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: displayName,
      });
      
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
  }, [isConfigured]);

  const login = useCallback((email: string, password: string) => {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    return signInWithEmailAndPassword(auth, email, password);
  }, [isConfigured]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Save Google photoURL to users collection profilePic field
      if (user.photoURL && isFirebaseConfigured()) {
        try {
          await firestoreServices.users.updateUser(user.uid, {
            profilePic: user.photoURL,
          });
          console.log('✅ Saved Google profile picture to users collection');
        } catch (error) {
          console.error('Error saving Google profile picture:', error);
          // Continue even if save fails
        }
      }
      
      return user;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups and try again.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else {
        throw new Error(`Google sign-in failed: ${error.message || 'Unknown error'}`);
      }
    }
  }, [isConfigured]);

  const logout = useCallback(() => {
    if (!auth || !isConfigured) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
    setUserProfile(null);
    return signOut(auth);
  }, [isConfigured]);

  const refreshProfile = useCallback(async () => {
    if (!currentUser?.uid || !isFirebaseConfigured()) {
      return;
    }
    try {
      const profile = await ProfileService.getProfile(currentUser.uid);
      setUserProfile(profile);
      
      // For Google users, update profilePic in users collection if photoURL changed
      const isGoogleUser = currentUser.providerData.some(provider => provider.providerId === 'google.com');
      if (isGoogleUser && currentUser.photoURL) {
        try {
          await firestoreServices.users.updateUser(currentUser.uid, {
            profilePic: currentUser.photoURL,
          });
        } catch (error) {
          console.error('Error updating Google profile picture:', error);
        }
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  }, [currentUser?.uid, currentUser?.photoURL, currentUser?.providerData]);

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
          // Only try to get profile if Firebase is configured
          if (isFirebaseConfigured()) {
            // Check if user is authenticated via Google provider
            const isGoogleUser = user.providerData.some(provider => provider.providerId === 'google.com');
            
            // If Google user, save/update photoURL to users collection profilePic field
            if (isGoogleUser && user.photoURL) {
              try {
                await firestoreServices.users.updateUser(user.uid, {
                  profilePic: user.photoURL,
                });
                setUserProfilePic(user.photoURL);
                console.log('✅ Updated Google profile picture in users collection');
              } catch (error) {
                console.error('Error updating Google profile picture:', error);
                // Continue even if update fails
              }
            } else {
              // For non-Google users, fetch profilePic from users collection
              try {
                const userDoc = await firestoreServices.users.getUser(user.uid);
                setUserProfilePic(userDoc?.profilePic || null);
              } catch (error) {
                console.error('Error fetching user profilePic:', error);
                setUserProfilePic(null);
              }
            }
            
            const profile = await ProfileService.getProfile(user.uid);
            setUserProfile(profile);
          } else {
            setUserProfile(null);
            setUserProfilePic(null);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
          setUserProfilePic(null);
        }
      } else {
        setUserProfile(null);
        setUserProfilePic(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [isConfigured]);

  const value = useMemo(() => ({
    currentUser,
    signup,
    login,
    signInWithGoogle,
    logout,
    loading,
    isConfigured,
    userProfile,
    userProfilePic,
    isEmailVerified: currentUser?.emailVerified || false,
    refreshProfile,
  }), [currentUser, loading, userProfile, userProfilePic, isConfigured, signup, login, signInWithGoogle, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
