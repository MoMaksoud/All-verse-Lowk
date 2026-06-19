'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    fetch(`/api/auth/verify-token?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        
        if (res.ok) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting...');
          setTimeout(() => {
            router.push('/signup?verified=1');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      })
      .catch((error) => {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020617' }}>
        <div className="max-w-md w-full rounded-2xl p-8" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
          {status === 'verifying' && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mb-4"></div>
              <h2 className="text-2xl font-bold text-white mb-2">Verifying Email</h2>
              <p className="text-gray-400">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="inline-block bg-green-500 rounded-full p-3 mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
              <p className="text-gray-400">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="inline-block bg-red-500 rounded-full p-3 mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-gray-400 mb-4">{message}</p>
              <Link
                href="/signup"
                className="inline-block px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
              >
                Back to Sign Up
              </Link>
            </div>
          )}
        </div>
    </div>
  );
}

