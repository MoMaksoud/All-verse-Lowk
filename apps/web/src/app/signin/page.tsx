'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isConfigured } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      router.push('/');
    } catch (error: any) {
      setError('Failed to sign in. Please check your credentials.');
    }

    setLoading(false);
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Logo size="lg" className="justify-center mb-8" />
            <h2 className="text-3xl font-bold text-white mb-2">Firebase Setup Required</h2>
            <p className="text-gray-400">Please configure Firebase to enable authentication</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium mb-2">Firebase Authentication is not configured.</p>
              <p className="text-sm">To enable user authentication, you need to:</p>
              <ol className="text-sm mt-2 ml-4 list-decimal">
                <li>Create a Firebase project at <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:text-accent-300 underline">console.firebase.google.com</a></li>
                <li>Enable Authentication → Sign-in method → Email/Password</li>
                <li>Get your Firebase config from Project Settings</li>
                <li>Create a <code className="bg-gray-700 px-1 rounded">.env.local</code> file with your Firebase credentials</li>
              </ol>
            </div>
            
            <div className="text-center">
              <Link
                href="/"
                className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="lg" className="justify-center mb-8" />
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:bg-gray-700/70 transition-all autofill:bg-gray-700/50 autofill:text-white autofill:shadow-[inset_0_0_0px_1000px_rgb(55,65,81,0.5)]"
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
                  className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:bg-gray-700/70 transition-all autofill:bg-gray-700/50 autofill:text-white autofill:shadow-[inset_0_0_0px_1000px_rgb(55,65,81,0.5)]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-200 ease-in-out group"
                >
                  <div className="relative">
                    <Eye 
                      className={`w-5 h-5 transition-all duration-300 ease-in-out ${
                        showPassword 
                          ? 'opacity-0 rotate-90 scale-75' 
                          : 'opacity-100 rotate-0 scale-100'
                      }`} 
                    />
                    <EyeOff 
                      className={`w-5 h-5 absolute top-0 left-0 transition-all duration-300 ease-in-out ${
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
              className="w-full bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link href="/signup" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
