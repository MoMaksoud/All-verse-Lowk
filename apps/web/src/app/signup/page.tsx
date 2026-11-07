'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Eye, EyeOff, Loader2, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { CreateProfileInput } from '@marketplace/types';
import { auth } from '@/lib/firebase';

// Dynamically import ProfileSetupForm - only loads when showProfileSetup is true
// This significantly improves initial page load time (~5s -> ~1-2s)
const ProfileSetupForm = dynamic(
  () => import('@/components/ProfileSetupForm').then(mod => ({ default: mod.ProfileSetupForm })),
  {
    loading: () => (
      <p className="flex items-center gap-2 text-sm text-zinc-600">
        <Loader2 strokeWidth={1.75} className="h-4 w-4 animate-spin" /> Loading profile setup…
      </p>
    ),
    ssr: false // Component is 'use client' and only shown after client-side signup
  }
);

function PasswordToggle({ shown, onToggle, label }: { shown: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 transition-colors hover:text-zinc-950"
    >
      {shown
        ? <EyeOff strokeWidth={1.75} className="h-4 w-4" />
        : <Eye strokeWidth={1.75} className="h-4 w-4" />}
    </button>
  );
}


export default function SignUp() {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const { signup, signInWithGoogle, isConfigured, currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // After email verification, user is redirected to /signup?verified=1 — show profile setup instead of Create Account
  useEffect(() => {
    const verifiedParam = searchParams.get('verified');
    if (verifiedParam !== '1' || !currentUser) return;

    let cancelled = false;
    (async () => {
      try {
        await auth?.authStateReady();
        const user = auth?.currentUser ?? currentUser;
        if (!user || cancelled) return;
        await user.reload();
        if (cancelled) return;
        setShowProfileSetup(true);
        // Remove ?verified=1 from URL without reload
        window.history.replaceState({}, '', '/signup');
      } catch {
        // If reload fails, still show profile setup
        if (!cancelled) setShowProfileSetup(true);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, currentUser]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Clear previous errors
    setError('');

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address (e.g., example@email.com)');
      return;
    }

    // Validate password length (Firebase requires at least 6 characters)
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Validate display name
    if (!formData.displayName || formData.displayName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }

    try {
      setLoading(true);
      await signup(formData.email.trim(), formData.password, formData.displayName.trim());
      
      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the current user from auth state
      const firebaseUser = auth?.currentUser;
      if (!firebaseUser) {
        setError('Failed to get user information. Please try again.');
        setLoading(false);
        return;
      }
      
      // Try to send verification email, but don't block signup if it fails
      try {
        const response = await fetch('/api/auth/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            userId: firebaseUser.uid,
          }),
        });

        if (response.ok) {
          setShowVerification(true);
        } else {
          const data = await response.json();
          console.warn('Verification email failed:', data.error);
          // Skip verification and go straight to profile setup
          setShowProfileSetup(true);
        }
      } catch (emailError) {
        console.warn('Error sending verification email:', emailError);
        // Skip verification and go straight to profile setup
        setShowProfileSetup(true);
      }
    } catch (error: any) {
      // Show the actual error message from Firebase
      const errorMessage = error?.message || 'Failed to create account. Please try again.';
      setError(errorMessage);
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit(profileData: CreateProfileInput) {
    try {
      setProfileLoading(true);
      setError(''); // Clear any previous errors
      
      // Wait for auth to be ready and get user directly from Firebase
      if (auth) {
        await auth.authStateReady();
      }
      
      // Get user directly from Firebase auth (more reliable than state)
      const firebaseUser = auth?.currentUser || currentUser;
      const userId = firebaseUser?.uid;
      
      if (!userId) {
        setError('You must be logged in to create a profile. Please try refreshing the page.');
        setProfileLoading(false);
        return;
      }

      // Email verification is now optional - skip this check
      // Users can create their profile immediately after signup
      await firebaseUser.reload();
      
      // Force token refresh before making the API call (especially important for Google sign-in)
      if (firebaseUser) {
        try {
          // Force refresh to get a fresh token
          const token = await firebaseUser.getIdToken(true);
          if (!token) {
            setError('Authentication error. Please try refreshing the page and signing up again.');
            setProfileLoading(false);
            return;
          }
          // Small delay to ensure token is fully propagated
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (tokenError) {
          setError('Authentication error. Please try refreshing the page and signing up again.');
          setProfileLoading(false);
          return;
        }
      }
      
      // Create profile with username and displayName
      // For Google users, use their Google displayName if available
      const displayNameToUse = currentUser?.displayName || formData.displayName || profileData.displayName || 'User';
      const profileToCreate = {
        ...profileData,
        username: profileData.username || displayNameToUse.toLowerCase().replace(/\s+/g, ''),
        displayName: displayNameToUse,
      };

      // Save profile to Firestore
      const { apiPut } = await import('@/lib/api-client');
      const response = await apiPut('/api/profile', profileToCreate);
      
      if (!response.ok) {
        let errorMessage = 'Failed to create profile';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          
          if (response.status === 401) {
            errorMessage = 'Authentication failed. Please try refreshing the page and signing up again.';
          } else if (response.status === 400) {
            errorMessage = errorData.error || 'Invalid profile data. Please check your information and try again.';
          }
        } catch (e) {
          if (response.status === 401) {
            errorMessage = 'Authentication failed. Please try refreshing the page and signing up again.';
          }
        }
        throw new Error(errorMessage);
      }

      await response.json();

      // Show success message
      setProfileSuccess(true);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error: any) {
      console.error('Profile creation error:', error);
      setError(error?.message || 'Failed to create profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  }

  function handleProfileCancel() {
    // Skip profile setup and go to home page
    router.push('/');
  }

  async function handleGoogleSignIn() {
    try {
      setError('');
      setLoading(true);
      const user = await signInWithGoogle();
      
      // Wait for auth state to be fully ready and force token refresh
      if (auth) {
        await auth.authStateReady();
        // Force a fresh token after Google sign-in
        if (user) {
          await user.getIdToken(true); // Force refresh
        }
        // Give auth state a moment to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Check if user already has a profile
      try {
        const { apiGet } = await import('@/lib/api-client');
        const response = await apiGet('/api/profile');
        
        if (response.ok) {
          // User has profile, redirect to home
          router.push('/');
        } else {
          // User needs to create profile
          setShowProfileSetup(true);
        }
      } catch (error) {
        // If profile doesn't exist, show profile setup
        setShowProfileSetup(true);
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to sign in with Google. Please try again.');
      console.error('Google sign-in error:', error);
    } finally {
      setLoading(false);
    }
  }


  if (!isConfigured) {
    return (
      <AuthShell>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Sign-up isn’t set up yet</h1>
        <p className="mt-2 text-zinc-600">Firebase Authentication is not configured for this environment.</p>
        <ol className="mt-6 list-decimal space-y-1.5 rounded-lg bg-amber-50 p-4 pl-8 text-sm text-amber-900">
          <li>Create a Firebase project at console.firebase.google.com</li>
          <li>Enable Authentication, then the Email/Password sign-in method</li>
          <li>Copy the web config from Project Settings</li>
          <li>Add it to <code className="rounded bg-amber-100 px-1">.env.local</code></li>
        </ol>
      </AuthShell>
    );
  }

  if (showVerification && currentUser) {
    return (
      <AuthShell>
        <div role="status">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Check your email</h1>
          <p className="mt-2 text-zinc-600">
            We sent a verification link to <span className="font-medium text-zinc-950">{currentUser.email}</span>.
            Open it to verify your account, then come back here.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            You need to verify before you can create your profile. Check your spam folder if it doesn’t arrive.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                const response = await fetch('/api/auth/send-verification-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: currentUser.email,
                    userId: currentUser.uid,
                  }),
                });
                if (response.ok) {
                  alert('Verification email sent again.');
                } else {
                  const data = await response.json();
                  alert(data.error || 'Couldn’t resend the email. Try again in a moment.');
                }
              } catch (error) {
                alert('Couldn’t resend the email. Try again in a moment.');
              }
            }}
            className="btn btn-outline gap-2"
          >
            <Mail strokeWidth={1.75} className="h-4 w-4" />
            Resend verification email
          </button>

          <button
            type="button"
            onClick={async () => {
              await currentUser.reload();
              if (currentUser.emailVerified) {
                setShowVerification(false);
                setShowProfileSetup(true);
              } else {
                alert('Your email isn’t verified yet. Open the link we sent you first.');
              }
            }}
            className="btn btn-primary"
          >
            I’ve verified my email
          </button>
        </div>
      </AuthShell>
    );
  }

  if (showProfileSetup) {
    return (
      <AuthShell>
        {profileSuccess ? (
          <div role="status">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Profile created</h1>
            <p className="mt-2 text-zinc-600">Taking you to AllVerse…</p>
            <Loader2 strokeWidth={1.75} className="mt-6 h-5 w-5 animate-spin text-primary-600" aria-hidden="true" />
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Set up your profile</h1>
            <p className="mt-2 text-zinc-600">This is how buyers and sellers will see you.</p>

            {error && (
              <p role="alert" className="mt-6 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <div className="mt-8">
              <ProfileSetupForm
                onSubmit={handleProfileSubmit}
                onCancel={handleProfileCancel}
                isLoading={profileLoading}
              />
            </div>
          </>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Create your account</h1>
      <p className="mt-2 text-zinc-600">Free to join. Listing is free too.</p>

      {error && (
        <p role="alert" className="mt-6 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate={false}>
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-zinc-950">Full name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            value={formData.displayName}
            onChange={handleChange}
            className="input"
            placeholder="Jordan Reyes"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-950">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-950">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="input pr-11"
              aria-describedby="password-help"
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} label="password" />
          </div>
          <p id="password-help" className="mt-1.5 text-xs text-zinc-500">At least 6 characters.</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-zinc-950">Confirm password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input pr-11"
            />
            <PasswordToggle shown={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} label="password" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading && <Loader2 strokeWidth={1.75} className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs text-zinc-500">or</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="btn btn-outline w-full gap-3"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <p className="mt-8 text-sm text-zinc-600">
        Already have an account?{' '}
        <Link href="/signin" className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
