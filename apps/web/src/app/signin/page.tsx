'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

const REASON_MESSAGES: Record<string, string> = {
  sell: 'Sign in to list an item for sale.',
  messages: 'Sign in to view your messages.',
  cart: 'Sign in to view your cart.',
  orders: 'Sign in to view your orders.',
  sales: 'Sign in to view your sales.',
  profile: 'Sign in to view your profile.',
};

function SignInInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle, isConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const reason = searchParams.get('reason') || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      router.push(redirectTo);
    } catch {
      setError('Failed to sign in. Please check your credentials.');
    }

    setLoading(false);
  }

  async function handleGoogleSignIn() {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      router.push(redirectTo);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const authPageShell = (content: React.ReactNode) => (
    <div className="min-h-screen flex flex-col" style={{ background: '#020617' }}>
      <Link
        href="/"
        className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: '#64748b' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
        onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </Link>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        {content}
      </div>
    </div>
  );

  if (!isConfigured) {
    return authPageShell(
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="lg" className="justify-center mb-8" />
          <h2 className="text-3xl font-bold text-white mb-2">Firebase Setup Required</h2>
          <p style={{ color: '#64748b' }}>Please configure Firebase to enable authentication</p>
        </div>
        <div className="rounded-2xl p-8" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-4 py-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
            <p className="font-medium mb-2">Firebase Authentication is not configured.</p>
            <p className="text-sm">To enable user authentication, you need to:</p>
            <ol className="text-sm mt-2 ml-4 list-decimal">
              <li>Create a Firebase project at console.firebase.google.com</li>
              <li>Enable Authentication → Sign-in method → Email/Password</li>
              <li>Get your Firebase config from Project Settings</li>
              <li>Create a <code className="px-1 rounded" style={{ background: '#1e293b' }}>.env.local</code> file with your Firebase credentials</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return authPageShell(
    <div className="max-w-md w-full space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome back</h2>
        <p className="text-sm sm:text-base" style={{ color: '#64748b' }}>Sign in to your AllVerse account</p>
      </div>

      <div className="rounded-xl sm:rounded-2xl p-6 sm:p-8" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
        {reason && REASON_MESSAGES[reason] && (
          <div className="px-4 py-3 rounded-lg mb-4 text-sm" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}>
            {REASON_MESSAGES[reason]}
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-lg mb-6 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 rounded-lg text-white text-sm sm:text-base focus:outline-none transition-all"
                  style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#3b82f6' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
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
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 pr-10 sm:pr-12 rounded-lg text-white text-sm sm:text-base focus:outline-none transition-all"
                    style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#3b82f6' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    placeholder="Enter your password"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#3b82f6' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2563eb'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#3b82f6'; }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <span className="text-xs" style={{ color: '#475569' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            <p className="mt-6 text-center text-sm" style={{ color: '#64748b' }}>
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium transition-colors" style={{ color: '#60a5fa' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
                onMouseLeave={e => (e.currentTarget.style.color = '#60a5fa')}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
  );
}

export default function SignIn() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}