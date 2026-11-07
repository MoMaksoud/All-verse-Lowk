'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Checking your verification link…');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('This link is missing its verification code. Open the link from your email again.');
      return;
    }

    fetch(`/api/auth/verify-token?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage('Your email is verified. Taking you back to sign up…');
          setTimeout(() => {
            router.push('/signup?verified=1');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'This link has expired or was already used.');
        }
      })
      .catch((error) => {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('We couldn’t reach the server. Check your connection and try the link again.');
      });
  }, [searchParams, router]);

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div role="status" aria-live="polite" className="animate-fade-in">
        {status === 'verifying' && (
          <>
            <Loader2 strokeWidth={1.75} className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">Verifying your email</h1>
            <p className="mt-2 text-zinc-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 strokeWidth={1.75} className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">Email verified</h1>
            <p className="mt-2 text-zinc-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle strokeWidth={1.75} className="h-8 w-8 text-red-700" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">We couldn’t verify this email</h1>
            <p className="mt-2 text-zinc-600">{message}</p>
            <Link href="/signup" className="btn btn-primary mt-8">
              Back to sign up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
