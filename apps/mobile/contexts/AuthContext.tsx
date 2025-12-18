import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signOut as firebaseSignOut, signIn as firebaseSignIn, signUp as firebaseSignUp } from '../lib/firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    return await firebaseSignIn(email, password);
  };

  const signUp = async (email: string, password: string) => {
    return await firebaseSignUp(email, password);
  };

  const signOut = async () => {
    console.log('🔴 AuthContext: signOut called');
    try {
      const result = await firebaseSignOut();
      console.log('🔴 AuthContext: firebaseSignOut result:', result);
      
      if (!result.error) {
        console.log('🔴 AuthContext: Clearing currentUser');
        setCurrentUser(null);
      } else {
        console.error('🔴 AuthContext: Sign out error:', result.error);
      }
      return result;
    } catch (error) {
      console.error('🔴 AuthContext: Exception during sign out:', error);
      return { error: String(error) };
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

