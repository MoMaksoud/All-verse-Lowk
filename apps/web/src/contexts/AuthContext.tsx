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
  refreshUser: () => Promise<{ uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null>;
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

  const refreshUser = useCallback(async () => {
    // Always read directly from auth.currentUser, not from state
    const current = auth.currentUser;
    if (!current) return null;
    
    return {
      uid: current.uid,
      displayName: current.displayName,
      email: current.email,
      photoURL: current.photoURL,
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    // Always read directly from auth.currentUser, not from state
    const current = auth.currentUser;
    if (!current?.uid || !isFirebaseConfigured()) {
      return;
    }
    try {
      const profile = await ProfileService.getProfile(current.uid);
      setUserProfile(profile);
      
      // Always read photoURL directly from auth.currentUser (not cached state)
      // For Google users, update profilePic in users collection if photoURL changed
      const isGoogleUser = current.providerData.some(provider => provider.providerId === 'google.com');
      if (isGoogleUser && current.photoURL) {
        try {
          await firestoreServices.users.updateUser(current.uid, {
            profilePic: current.photoURL,
          });
          // Update state with latest photoURL from auth
          setUserProfilePic(current.photoURL);
        } catch (error) {
          console.error('Error updating Google profile picture:', error);
        }
      } else if (current.photoURL) {
        // For any user with photoURL, update state directly from auth
        setUserProfilePic(current.photoURL);
      } else {
        // For non-Google users, fetch profilePic from users collection
        try {
          const userDoc = await firestoreServices.users.getUser(current.uid);
          setUserProfilePic(userDoc?.profilePic || null);
        } catch (error) {
          console.error('Error fetching user profilePic:', error);
          setUserProfilePic(null);
        }
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  }, []);

  useEffect(() => {
    if (!auth || !isConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // Always read photoURL directly from auth.currentUser (not from user param)
      // This ensures we get the latest value, not a cached snapshot
      const currentAuthUser = auth.currentUser;
      
      // Load user profile from Firestore if user is authenticated
      if (user && currentAuthUser) {
        try {
          // Only try to get profile if Firebase is configured
          if (isFirebaseConfigured()) {
            // Always read photoURL directly from auth.currentUser
            // Check if user is authenticated via Google provider
            const isGoogleUser = currentAuthUser.providerData.some(provider => provider.providerId === 'google.com');
            
            // If Google user, save/update photoURL to users collection profilePic field
            if (isGoogleUser && currentAuthUser.photoURL) {
              try {
                await firestoreServices.users.updateUser(currentAuthUser.uid, {
                  profilePic: currentAuthUser.photoURL,
                });
                // Always use photoURL directly from auth.currentUser
                setUserProfilePic(currentAuthUser.photoURL);
                console.log('✅ Updated Google profile picture in users collection');
              } catch (error) {
                console.error('Error updating Google profile picture:', error);
                // Continue even if update fails, but still set photoURL from auth
                setUserProfilePic(currentAuthUser.photoURL);
              }
            } else if (currentAuthUser.photoURL) {
              // For any user with photoURL, use it directly from auth
              setUserProfilePic(currentAuthUser.photoURL);
            } else {
              // For non-Google users without photoURL, fetch profilePic from users collection
              try {
                const userDoc = await firestoreServices.users.getUser(currentAuthUser.uid);
                setUserProfilePic(userDoc?.profilePic || null);
              } catch (error) {
                console.error('Error fetching user profilePic:', error);
                setUserProfilePic(null);
              }
            }
            
            const profile = await ProfileService.getProfile(currentAuthUser.uid);
            setUserProfile(profile);
          } else {
            setUserProfile(null);
            setUserProfilePic(null);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
          // Still try to set photoURL from auth if available
          if (currentAuthUser?.photoURL) {
            setUserProfilePic(currentAuthUser.photoURL);
          } else {
            setUserProfilePic(null);
          }
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
    refreshUser,
  }), [currentUser, loading, userProfile, userProfilePic, isConfigured, signup, login, signInWithGoogle, logout, refreshProfile, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
