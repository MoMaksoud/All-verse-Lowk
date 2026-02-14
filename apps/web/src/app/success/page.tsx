'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { DynamicBackground } from '@/components/DynamicBackground';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderSummary, setOrderSummary] = useState<{ orderIdShort: string; total: number; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setError('Missing session');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/payments/confirm?session_id=${encodeURIComponent(sessionId.trim())}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || 'Could not confirm order');
          return;
        }
        if (data.success && data.order) {
          setOrderSummary({
            orderIdShort: data.order.orderIdShort || '',
            total: data.order.total ?? 0,
            status: data.order.status || '',
          });
        }
      } catch {
        if (!cancelled) setError('Could not confirm order');
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="low" showParticles={true} />
      <Navigation />
      <div className="relative z-10 min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-block bg-green-500/20 rounded-full p-4 mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Order confirmed</h1>
          <p className="text-gray-400 mb-6">
            Thank you for your purchase. You will receive an email confirmation shortly.
            {orderSummary?.orderIdShort && (
              <span className="block mt-2 text-gray-300">
                Order #<span className="font-mono text-white">{orderSummary.orderIdShort}</span>
                {orderSummary.total > 0 && (
                  <span className="block text-sm mt-1">Total: ${orderSummary.total.toFixed(2)}</span>
                )}
              </span>
            )}
            {error && (
              <span className="block mt-2 text-amber-400 text-sm">We received your payment. {error}</span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/orders"
              className="inline-flex items-center justify-center px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg transition-colors"
            >
              View orders
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-dark-600 hover:bg-dark-500 text-white font-semibold rounded-lg transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
