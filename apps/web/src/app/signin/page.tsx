'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell } from '@/components/AuthShell';

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

  if (!isConfigured) {
    return (
      <AuthShell>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Sign-in isn’t set up yet</h1>
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

  return (
    <AuthShell>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Sign in</h1>
      <p className="mt-2 text-zinc-600">
        {reason && REASON_MESSAGES[reason] ? REASON_MESSAGES[reason] : 'Welcome back to AllVerse.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate={false}>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-950">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-950">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'signin-error' : undefined}
              className="input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 transition-colors hover:text-zinc-950"
            >
              {showPassword
                ? <EyeOff strokeWidth={1.75} className="h-4 w-4" />
                : <Eye strokeWidth={1.75} className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <p id="signin-error" role="alert" className="mt-1.5 text-sm text-red-700">{error}</p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading && <Loader2 strokeWidth={1.75} className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Signing in…' : 'Sign in'}
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
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="mt-8 text-sm text-zinc-600">
        New to AllVerse?{' '}
        <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-700">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.970 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.090s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.060.56 4.21 1.64l3.15-3.15C17.45 2.09 14.970 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div className="min-h-[70dvh]" />}>
      <SignInInner />
    </Suspense>
  );
}