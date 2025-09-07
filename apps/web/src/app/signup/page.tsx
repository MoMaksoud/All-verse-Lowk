'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { DynamicBackground } from '@/components/DynamicBackground';

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
  const { signup, isConfigured } = useAuth();
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await signup(formData.email, formData.password, formData.displayName);
      router.push('/');
    } catch (error: any) {
      setError('Failed to create account. Please try again.');
    }

    setLoading(false);
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="med" showParticles={true} />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div className="text-center">
            <Logo size="lg" className="justify-center mb-6 sm:mb-8" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Create Account</h2>
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

            <div className="mt-5 sm:mt-6 text-center relative z-10">
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
  );
}