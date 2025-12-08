'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { DynamicBackground } from '@/components/DynamicBackground';
import { CreateProfileInput } from '@marketplace/types';
import { auth } from '@/lib/firebase';

// Dynamically import ProfileSetupForm - only loads when showProfileSetup is true
// This significantly improves initial page load time (~5s -> ~1-2s)
const ProfileSetupForm = dynamic(
  () => import('@/components/ProfileSetupForm').then(mod => ({ default: mod.ProfileSetupForm })),
  { 
    loading: () => (
      <div className="max-w-md mx-auto bg-dark-800 rounded-2xl p-8 border border-dark-700 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading profile setup...</p>
      </div>
    ),
    ssr: false // Component is 'use client' and only shown after client-side signup
  }
);

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
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const { signup, signInWithGoogle, isConfigured, currentUser } = useAuth();
  const router = useRouter();

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

  async function handleVerifyEmail() {
    if (!currentUser) return;

    setVerificationError('');
    setVerifying(true);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          email: currentUser.email,
          userId: currentUser.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVerificationError(data.error || 'Verification failed');
        return;
      }

      // Email verified successfully
      setShowVerification(false);
      setShowProfileSetup(true);
    } catch (error: any) {
      setVerificationError('Failed to verify email. Please try again.');
      console.error('Verification error:', error);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendCode() {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: currentUser.email,
        }),
      });

      if (response.ok) {
        setVerificationError('');
        alert('Verification code resent!');
      } else {
        setVerificationError('Failed to resend code. Please try again.');
      }
    } catch (error) {
      console.error('Error resending code:', error);
      setVerificationError('Failed to resend code. Please try again.');
    }
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
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <div className="relative z-10 min-h-screen">
          <Link 
            href="/" 
            className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 text-gray-300 hover:text-white px-4 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 transition-all duration-200 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center">
                <Logo size="lg" className="justify-center mb-8" />
                <h2 className="text-3xl font-bold text-white mb-2">Firebase Setup Required</h2>
                <p className="text-gray-400">Please configure Firebase to enable authentication</p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-lg">
                  <p className="font-medium mb-2">Firebase Authentication is not configured.</p>
                  <p className="text-sm">To enable user authentication, you need to:</p>
                  <ol className="text-sm mt-2 ml-4 list-decimal">
                    <li>Create a Firebase project at <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:text-accent-300 underline">console.firebase.google.com</a></li>
                    <li>Enable Authentication → Sign-in method → Email/Password</li>
                    <li>Get your Firebase config from Project Settings</li>
                    <li>Create a <code className="bg-gray-700 px-1 rounded">.env.local</code> file with your Firebase credentials</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show email verification after signup
  if (showVerification && currentUser) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <div className="relative z-10 min-h-screen">
          <Link 
            href="/" 
            className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 text-gray-300 hover:text-white px-4 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 transition-all duration-200 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md mx-auto bg-dark-800 rounded-2xl p-8 border border-dark-700">
              <div className="text-center mb-6">
                <div className="inline-block bg-accent-500/20 rounded-full p-4 mb-4">
                  <svg className="w-12 h-12 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
                <p className="text-gray-400 mb-4">
                  We've sent a verification link to <strong className="text-white">{currentUser.email}</strong>
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  Please click the link in the email to verify your account before continuing.
                </p>
              </div>
              
              <div className="bg-dark-700/50 rounded-lg p-4 mb-6">
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">Note:</strong> You must verify your email before you can create your profile and use the platform.
                </p>
              </div>

              <div className="space-y-3">
                <button
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
                        alert('Verification email resent!');
                      } else {
                        const data = await response.json();
                        alert(data.error || 'Failed to resend email. Please try again.');
                      }
                    } catch (error) {
                      alert('Failed to resend email. Please try again.');
                    }
                  }}
                  className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  Resend Verification Email
                </button>
                
                <button
                  onClick={async () => {
                    // Check if email is verified
                    await currentUser.reload();
                    if (currentUser.emailVerified) {
                      setShowVerification(false);
                      setShowProfileSetup(true);
                    } else {
                      alert('Please verify your email first by clicking the link we sent you.');
                    }
                  }}
                  className="w-full px-4 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors"
                >
                  I've Verified My Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show profile setup form after successful signup
  if (showProfileSetup) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <div className="relative z-10 min-h-screen">
          <Link 
            href="/" 
            className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 text-gray-300 hover:text-white px-4 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 transition-all duration-200 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
          <div className="min-h-screen flex items-center justify-center px-4 py-8">
            {profileSuccess ? (
              <div className="max-w-md mx-auto bg-dark-800 rounded-2xl p-8 border border-dark-700 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Profile Created Successfully!</h2>
                <p className="text-gray-400 mb-4">Your profile has been saved and you'll be redirected shortly.</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500 mx-auto"></div>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
              
              {/* Error display for profile creation */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}
              
              <ProfileSetupForm
                onSubmit={handleProfileSubmit}
                onCancel={handleProfileCancel}
                isLoading={profileLoading}
              />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="med" showParticles={true} />
      <div className="relative z-10 min-h-screen">
        <Link 
          href="/" 
          className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 text-gray-300 hover:text-white px-4 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 transition-all duration-200 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-10 mb-2">Create Account</h2>
              <p className="text-sm sm:text-base text-gray-400">Join All Verse today</p>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-600/50 shadow-2xl relative overflow-hidden">
              {/* Futuristic glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 rounded-xl sm:rounded-2xl"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"></div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 relative z-10">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:bg-gray-700/70 transition-all autofill:bg-gray-700/50 autofill:text-white autofill:shadow-[inset_0_0_0px_1000px_rgb(55,65,81,0.5)] text-sm sm:text-base"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:bg-gray-700/70 transition-all autofill:bg-gray-700/50 autofill:text-white autofill:shadow-[inset_0_0_0px_1000px_rgb(55,65,81,0.5)] text-sm sm:text-base"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-3 sm:py-3 pr-10 sm:pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:bg-gray-700/70 transition-all autofill:bg-gray-700/50 autofill:text-white autofill:shadow-[inset_0_0_0px_1000px_rgb(55,65,81,0.5)] text-sm sm:text-base"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-200 ease-in-out group p-1"
                    >
                      <div className="relative">
                        <Eye 
                          className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ease-in-out ${
                            showPassword 
                              ? 'opacity-0 rotate-90 scale-75' 
                              : 'opacity-100 rotate-0 scale-100'
                          }`}
                        />
                        <EyeOff 
                          className={`w-4 h-4 sm:w-5 sm:h-5 absolute top-0 left-0 transition-all duration-300 ease-in-out ${
                            showPassword 
                              ? 'opacity-100 rotate-0 scale-100' 
                              : 'opacity-0 -rotate-90 scale-75'
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-3 sm:py-3 pr-10 sm:pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:bg-gray-700/70 transition-all autofill:bg-gray-700/50 autofill:text-white autofill:shadow-[inset_0_0_0px_1000px_rgb(55,65,81,0.5)] text-sm sm:text-base"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-200 ease-in-out group p-1"
                    >
                      <div className="relative">
                        <Eye 
                          className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ease-in-out ${
                            showConfirmPassword 
                              ? 'opacity-0 rotate-90 scale-75' 
                              : 'opacity-100 rotate-0 scale-100'
                          }`}
                        />
                        <EyeOff 
                          className={`w-4 h-4 sm:w-5 sm:h-5 absolute top-0 left-0 transition-all duration-300 ease-in-out ${
                            showConfirmPassword 
                              ? 'opacity-100 rotate-0 scale-100' 
                              : 'opacity-0 -rotate-90 scale-75'
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-3 px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <div className="relative z-10 mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800/30 text-gray-400">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Sign up with Google</span>
                </button>
              </div>

              <div className="mt-5 sm:mt-6 text-center relative z-10 space-y-4">
                <p className="text-sm sm:text-base text-gray-400">
                  Already have an account?{' '}
                  <Link href="/signin" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}