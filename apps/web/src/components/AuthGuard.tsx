'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  reason?: string;
}

/**
 * Wraps a page that requires authentication. While Firebase auth is resolving
 * it shows a spinner (no flash). Once resolved, unauthenticated users are
 * redirected to sign-in. Authenticated users see the children immediately.
 */
export function AuthGuard({ children, redirectTo = '/', reason }: AuthGuardProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !currentUser) {
      const params = new URLSearchParams();
      if (redirectTo !== '/') params.set('redirect', redirectTo);
      if (reason) params.set('reason', reason);
      const query = params.toString();
      router.push(`/signin${query ? `?${query}` : ''}`);
    }
  }, [loading, currentUser, router, redirectTo, reason]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
