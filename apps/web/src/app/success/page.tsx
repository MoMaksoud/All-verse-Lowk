'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const NEXT_STEPS = [
  { title: 'The seller ships it', body: 'The tracking number appears on your order once it’s on the way.' },
  { title: 'Follow the delivery', body: 'Check status and tracking any time from your Orders page.' },
  { title: 'Questions?', body: 'Message the seller directly from Messages.' },
];

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderSummary, setOrderSummary] = useState<{ orderIdShort: string; total: number; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!sessionId?.trim()) {
      setError('This page is missing its checkout reference.');
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

        // 202 = webhook hasn't written the order yet
        if (res.status === 202 && attempts < MAX_ATTEMPTS) {
          attempts++;
          setTimeout(poll, RETRY_MS);
          return;
        }

        if (!res.ok) {
          setError(data.error || 'We couldn’t load the order details yet.');
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
        if (!cancelled) setError('We couldn’t load the order details yet.');
      } finally {
        if (!cancelled) setPolling(false);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="mx-auto min-h-[70dvh] w-full max-w-2xl px-4 pb-20 pt-14 sm:px-6">
      <CheckCircle2 strokeWidth={1.5} className="h-10 w-10 text-primary-600" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">Thanks, your order is in</h1>
      <p className="mt-2 text-zinc-600">Payment went through. You can follow everything from your Orders page.</p>

      <dl className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200 text-sm" aria-busy={polling}>
        <div className="flex justify-between py-3">
          <dt className="text-zinc-500">Order</dt>
          <dd className="font-medium tabular-nums text-zinc-950">
            {orderSummary?.orderIdShort
              ? `#${orderSummary.orderIdShort}`
              : polling
                ? <span className="inline-block h-4 w-20 animate-pulse rounded bg-zinc-100 align-middle" />
                : '—'}
          </dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-zinc-500">Total paid</dt>
          <dd className="font-medium tabular-nums text-zinc-950">
            {orderSummary && orderSummary.total > 0
              ? formatCurrency(orderSummary.total)
              : polling
                ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-zinc-100 align-middle" />
                : '—'}
          </dd>
        </div>
      </dl>

      {error && (
        <p role="status" className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" />
          <span>We couldn’t load the order details yet. They’ll appear in Orders shortly.</span>
        </p>
      )}

      <h2 className="mt-12 font-semibold text-zinc-950">What happens next</h2>
      <ol className="mt-5 space-y-5">
        {NEXT_STEPS.map((s, i) => (
          <li key={s.title} className="reveal grid grid-cols-[2rem_1fr] gap-3" style={{ '--i': i } as React.CSSProperties}>
            <span
              className={clsx(
                'grid h-7 w-7 place-items-center rounded-full text-xs font-semibold tabular-nums',
                i === 0 ? 'bg-primary-600 text-white' : 'bg-zinc-100 text-zinc-600'
              )}
            >
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-zinc-950">{s.title}</p>
              <p className="mt-0.5 text-sm text-zinc-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/orders" className="btn btn-primary">View my orders</Link>
        <Link href="/listings" className="btn btn-outline">Keep shopping</Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[70dvh]" />}>
      <SuccessContent />
    </Suspense>
  );
}
