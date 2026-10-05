'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import clsx from 'clsx';
import { ShoppingBag, ShieldCheck, AlertCircle, ImageOff } from 'lucide-react';
import { normalizeImageSrc } from '@marketplace/shared-logic';
import { useAuth } from '@/contexts/AuthContext';
import { calculateCheckoutTotals } from '@/lib/payments/pricing';
import { categoryLabel } from '@/lib/categories';
import CheckoutPage from '@/components/CheckoutForm';


const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (typeof p.message === 'string' && p.message.trim()) return p.message;
    if (typeof p.error === 'string' && p.error.trim()) return p.error;
    if (typeof p.code === 'string' && p.code.trim()) return `${fallback} (${p.code})`;
  }
  return fallback;
}

interface CartItem {
  listingId: string;
  sellerId: string;
  qty: number;
  priceAtAdd: number;
}

interface Listing {
  id: string;
  title: string;
  photos: string[];
  category: string;
  condition: string;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const { currentUser, loading: authLoading } = useAuth();

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/carts');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(errorData, 'We couldn’t load your cart.'));
      }

      const data = await response.json();
      const cart = data.data || data;
      const rawItems: CartItem[] = Array.isArray(cart.items) ? cart.items : [];

      const listingResults = await Promise.all(
        rawItems.map(async (item) => {
          const res = await apiGet(`/api/listings/${item.listingId}`, { requireAuth: false });
          if (!res.ok) return null;
          const d = await res.json();
          const listing = d.data || d;
          return listing && typeof listing === 'object' ? { id: item.listingId, listing } : null;
        })
      );

      const listingsMap: Record<string, Listing> = {};
      listingResults.forEach((r) => { if (r) listingsMap[r.id] = r.listing; });

      // Drop cart items whose listings are gone.
      const liveItems = rawItems.filter((item) => !!listingsMap[item.listingId]);
      setCartItems(liveItems);
      setListings(listingsMap);

      const uniqueSellerIds = [...new Set(liveItems.map((i) => i.sellerId).filter(Boolean))];
      const nameEntries = await Promise.all(
        uniqueSellerIds.map(async (sellerId) => {
          try {
            const res = await apiGet(`/api/profile?userId=${sellerId}`, { requireAuth: false });
            if (res.ok) {
              const d = await res.json();
              return [sellerId, d.data?.displayName || d.data?.username || 'Seller'] as const;
            }
          } catch {
            // ignore
          }
          return [sellerId, 'Seller'] as const;
        })
      );
      setSellerNames(Object.fromEntries(nameEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t load your cart.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.uid) fetchCart();
  }, [currentUser, fetchCart]);

  const removeItem = async (listingId: string) => {
    if (removingItems.has(listingId)) return;
    setRemovingItems((prev) => new Set(prev).add(listingId));
    try {
      const { apiDelete } = await import('@/lib/api-client');
      const response = await apiDelete(`/api/carts?listingId=${listingId}`);
      if (response.ok) {
        setCartItems((prev) => prev.filter((i) => i.listingId !== listingId));
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(getApiErrorMessage(errorData, 'Couldn’t remove that item.'));
      }
    } catch {
      setError('Couldn’t remove that item.');
    } finally {
      setRemovingItems((prev) => { const next = new Set(prev); next.delete(listingId); return next; });
    }
  };

  const handleBackFromCheckout = () => {
    setShowCheckout(false);
    fetchCart();
  };

  // Each seller is a separate order and payment, so totals (and the fixed card fee) are per seller.
  const sellerGroups = (() => {
    const map = new Map<string, CartItem[]>();
    for (const item of cartItems) {
      if (!map.has(item.sellerId)) map.set(item.sellerId, []);
      map.get(item.sellerId)!.push(item);
    }
    return [...map.entries()].map(([sellerId, items]) => ({
      sellerId,
      sellerName: sellerNames[sellerId] || 'Seller',
      items,
      totals: calculateCheckoutTotals(items.reduce((s, i) => s + i.priceAtAdd, 0)),
    }));
  })();
  const sum = (k: 'subtotal' | 'tax' | 'fees' | 'total') => sellerGroups.reduce((s, g) => s + g.totals[k], 0);

  if (authLoading) return <CartSkeleton />;

  if (!currentUser) {
    return (
      <Shell>
        <EmptyState
          title="Sign in to see your cart"
          body="Items you add are saved to your account."
          href="/signin?redirect=/cart&reason=cart"
          cta="Sign in"
        />
      </Shell>
    );
  }

  if (showCheckout) {
    return <CheckoutPage cartItems={cartItems} onBack={handleBackFromCheckout} />;
  }

  return (
    <Shell count={!loading && !error ? cartItems.length : undefined}>
      {loading ? (
        <CartBody />
      ) : error ? (
        <div role="alert" className="flex max-w-xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div>
            <p className="text-red-800">{error}</p>
            <button onClick={fetchCart} className="mt-2 font-medium text-red-800 underline underline-offset-4">Try again</button>
          </div>
        </div>
      ) : cartItems.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          body="When you find something you like, add it here and check out when you’re ready."
          href="/listings"
          cta="Browse the marketplace"
        />
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
          <div className="space-y-10">
            {sellerGroups.map((group) => (
              <section key={group.sellerId} aria-label={`Items from ${group.sellerName}`}>
                <div className="flex items-baseline justify-between border-b border-zinc-200 pb-3">
                  <h2 className="text-sm text-zinc-500">
                    Sold by{' '}
                    <Link href={`/profile/${group.sellerId}`} className="font-medium text-zinc-950 hover:text-primary-700">
                      {group.sellerName}
                    </Link>
                  </h2>
                  {sellerGroups.length > 1 && (
                    <span className="text-sm tabular-nums text-zinc-500">{formatCurrency(group.totals.subtotal)}</span>
                  )}
                </div>

                <ul className="divide-y divide-zinc-200">
                  {group.items.map((item, i) => {
                    const listing = listings[item.listingId];
                    if (!listing) return null;
                    const removing = removingItems.has(item.listingId);
                    const src = normalizeImageSrc(listing.photos?.[0] || '');
                    return (
                      <li
                        key={item.listingId}
                        className={clsx('reveal grid grid-cols-[5.5rem_1fr_auto] gap-4 py-5 transition-opacity', removing && 'opacity-50')}
                        style={{ '--i': i } as React.CSSProperties}
                      >
                        <Link href={`/listings/${item.listingId}`} className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                          {src ? (
                            <Image src={src} alt="" fill sizes="88px" className="object-cover" />
                          ) : (
                            <ImageOff strokeWidth={1.5} className="absolute inset-0 m-auto h-5 w-5 text-zinc-400" />
                          )}
                        </Link>
                        <div className="min-w-0">
                          <Link href={`/listings/${item.listingId}`} className="line-clamp-2 font-medium text-zinc-950 hover:text-primary-700">
                            {listing.title}
                          </Link>
                          <p className="mt-1 text-sm capitalize text-zinc-500">
                            {[listing.condition?.replace('-', ' '), categoryLabel(listing.category)].filter(Boolean).join(' · ')}
                          </p>
                          <button
                            onClick={() => removeItem(item.listingId)}
                            disabled={removing}
                            className="mt-3 text-sm text-zinc-500 underline-offset-4 hover:text-red-600 hover:underline disabled:cursor-wait"
                          >
                            {removing ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                        <span className="font-semibold tabular-nums text-zinc-950">{formatCurrency(item.priceAtAdd)}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <h2 className="font-semibold text-zinc-950">Summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <Row label={`Items (${cartItems.length})`} value={formatCurrency(sum('subtotal'))} />
              <Row label="Estimated tax" value={formatCurrency(sum('tax'))} />
              <Row label="Card processing" value={formatCurrency(sum('fees'))} />
              <Row label="Shipping" value="At checkout" muted />
              <div className="flex justify-between border-t border-zinc-200 pt-4">
                <dt className="font-medium text-zinc-950">Estimated total</dt>
                <dd className="text-lg font-semibold tabular-nums text-zinc-950">{formatCurrency(sum('total'))}</dd>
              </div>
            </dl>

            {sellerGroups.length > 1 && (
              <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                Your cart has items from {sellerGroups.length} sellers. Each ships separately and is paid for separately at checkout.
              </p>
            )}

            <button onClick={() => setShowCheckout(true)} className="btn btn-primary mt-6 w-full py-3">
              Continue to checkout
            </button>

            <p className="mt-4 flex gap-2 text-xs leading-relaxed text-zinc-500">
              <ShieldCheck strokeWidth={1.75} className="h-4 w-4 shrink-0 text-primary-600" />
              Checkout is handled by Stripe. AllVerse never sees your card number.
            </p>
          </aside>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="mx-auto min-h-[70dvh] w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Cart</h1>
      <p className="mt-1 h-5 text-sm text-zinc-500">
        {count ? `${count} ${count === 1 ? 'item' : 'items'}` : ''}
      </p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-600">{label}</dt>
      <dd className={clsx('tabular-nums', muted ? 'text-zinc-500' : 'text-zinc-950')}>{value}</dd>
    </div>
  );
}

function EmptyState({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="max-w-md py-10">
      <ShoppingBag strokeWidth={1.5} className="h-10 w-10 text-zinc-400" />
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-zinc-950">{title}</h2>
      <p className="mt-2 text-zinc-600">{body}</p>
      <Link href={href} className="btn btn-primary mt-6">{cta}</Link>
    </div>
  );
}

function CartBody() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14" aria-busy="true">
      <div className="divide-y divide-zinc-200 border-t border-zinc-200">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="grid grid-cols-[5.5rem_1fr_auto] gap-4 py-5">
            <div className="aspect-square animate-pulse rounded-lg bg-zinc-100" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-zinc-100" />
    </div>
  );
}

function CartSkeleton() {
  return (
    <Shell>
      <CartBody />
    </Shell>
  );
}
