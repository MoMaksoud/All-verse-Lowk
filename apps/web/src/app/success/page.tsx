'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Package } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderSummary, setOrderSummary] = useState<{ orderIdShort: string; total: number; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setError('Missing session');
      setPolling(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 8;
    const RETRY_MS = 2000;

    const poll = async () => {
      try {
        const { apiGet } = await import('@/lib/api-client');
        const res = await apiGet(`/api/payments/confirm?session_id=${encodeURIComponent(sessionId.trim())}`);
        const data = await res.json();
        if (cancelled) return;

        if (res.status === 202 && attempts < MAX_ATTEMPTS) {
          attempts++;
          setTimeout(poll, RETRY_MS);
          return;
        }

        if (!res.ok) {
          setError(data.error || 'Could not confirm order');
          setPolling(false);
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
      } finally {
        if (!cancelled) setPolling(false);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: '#020617' }}
    >
      <div className="max-w-sm w-full text-center">

        {/* Icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(34,197,94,0.10)',
            border: '1px solid rgba(34,197,94,0.22)',
          }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: '#22c55e' }} />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-2">Order confirmed</h1>
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#64748b' }}>
          Thank you for your purchase. You'll receive a confirmation email shortly.
        </p>

        {/* Order summary */}
        {polling && !orderSummary && (
          <div className="flex items-center justify-center gap-2 mt-4 mb-6" style={{ color: '#475569' }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Confirming order…</span>
          </div>
        )}

        {orderSummary?.orderIdShort && (
          <div
            className="rounded-xl px-4 py-3 mt-4 mb-6 text-left"
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Package className="w-4 h-4 shrink-0" style={{ color: '#3b82f6' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#475569' }}>
                Order details
              </span>
            </div>
            <p className="text-sm" style={{ color: '#cbd5e1' }}>
              Order{' '}
              <span className="font-mono text-white">#{orderSummary.orderIdShort}</span>
            </p>
            {orderSummary.total > 0 && (
              <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
                {formatCurrency(orderSummary.total)}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs mt-2 mb-4 px-3 py-2 rounded-lg" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)' }}>
            We received your payment — {error}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link
            href="/orders"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#3b82f6' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
          >
            View orders
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: '#1e293b', color: '#cbd5e1' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#020617' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#3b82f6' }} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
