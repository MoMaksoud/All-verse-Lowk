'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

import dynamic from 'next/dynamic';
const CheckoutPage = dynamic(() => import('@/components/CheckoutForm'), {
  ssr: false,
  loading: () => null,
});
import { ShoppingBag, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';

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
  description: string;
  price: number;
  photos: string[];
  category: string;
  condition: string;
  sellerId: string;
  inventory: number;
  isActive: boolean;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { currentUser } = useAuth();
  const router = useRouter();

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/carts');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(errorData, 'Failed to fetch cart'));
      }

      const data = await response.json();
      const cart = data.data || data;
      const rawItems: CartItem[] = Array.isArray(cart.items) ? cart.items : [];

      // Fetch all listing details in parallel.
      const listingResults = await Promise.all(
        rawItems.map(async (item) => {
          const res = await apiGet(`/api/listings/${item.listingId}`, { requireAuth: false } as Parameters<typeof apiGet>[1]);
          if (!res.ok) return null;
          const d = await res.json();
          const listing = d.data || d;
          return listing && typeof listing === 'object' ? { id: item.listingId, listing } : null;
        })
      );

      const listingsMap: Record<string, Listing> = {};
      listingResults.forEach((r) => { if (r) listingsMap[r.id] = r.listing; });

      // Drop cart items whose listings are gone.
      setCartItems(rawItems.filter((item) => !!listingsMap[item.listingId]));
      setListings(listingsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cart');
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
        setError(getApiErrorMessage(errorData, 'Failed to remove item'));
      }
    } catch {
      setError('Failed to remove item');
    } finally {
      setRemovingItems((prev) => { const next = new Set(prev); next.delete(listingId); return next; });
    }
  };

  const handleCheckout = () => {
    if (checkoutLoading || cartItems.length === 0) return;
    setCheckoutLoading(true);
    setShowCheckout(true);
  };

  const handleBackFromCheckout = () => {
    setCheckoutLoading(false);
    setShowCheckout(false);
    fetchCart();
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.priceAtAdd, 0);
  const tax = subtotal * 0.08;
  const fees = (subtotal + tax) * 0.029 + 0.30;
  const estimatedTotal = subtotal + tax + fees;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#020617]">
        
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Sign in to view your bag</h1>
            <button
              onClick={() => router.push('/signin?redirect=/cart&reason=cart')}
              className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-[#020617]">
        
        <div className="min-h-0">
          <CheckoutPage cartItems={cartItems} onBack={handleBackFromCheckout} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      

      <div className="px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Your Bag</h1>
          {cartItems.length > 0 && (
            <p className="text-gray-400 mb-8">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-gray-400 mb-4">{error}</p>
              <button onClick={fetchCart} className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                Try Again
              </button>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Your bag is empty</h2>
              <p className="text-gray-400 mb-6">Find something you love.</p>
              <Link
                href="/listings"
                className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Items */}
              <div className="lg:col-span-2 space-y-3">
                {cartItems.map((item) => {
                  const listing = listings[item.listingId];
                  if (!listing) return null;
                  const removing = removingItems.has(item.listingId);

                  return (
                    <div
                      key={item.listingId}
                      className={`bg-dark-800 border border-dark-700 rounded-xl p-4 flex items-center gap-4 transition-opacity ${removing ? 'opacity-50' : ''}`}
                    >
                      {/* Image */}
                      <Link href={`/listings/${item.listingId}`} className="shrink-0">
                        <div className="w-20 h-20 bg-dark-700 rounded-lg overflow-hidden">
                          {listing.photos?.[0] ? (
                            <img
                              src={listing.photos[0]}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/listings/${item.listingId}`}>
                          <p className="text-white font-medium truncate hover:text-accent-400 transition-colors">
                            {listing.title}
                          </p>
                        </Link>
                        <p className="text-gray-500 text-sm capitalize">{listing.condition}</p>
                        <p className="text-gray-500 text-sm">{listing.category}</p>
                      </div>

                      {/* Price + Remove */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-white font-semibold text-lg">
                          {formatPrice(item.priceAtAdd)}
                        </span>
                        <button
                          onClick={() => removeItem(item.listingId)}
                          disabled={removing}
                          aria-label="Remove item"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-dark-700 transition-colors"
                        >
                          {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 sticky top-24">
                  <h2 className="text-lg font-semibold text-white mb-5">Order Summary</h2>

                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between text-gray-400">
                      <span>Items ({cartItems.length})</span>
                      <span className="text-white">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Tax (est. 8%)</span>
                      <span className="text-white">{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Processing fee</span>
                      <span className="text-white">{formatCurrency(fees)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Shipping</span>
                      <span className="text-gray-500">Calculated at checkout</span>
                    </div>
                    <div className="border-t border-dark-600 pt-3 flex justify-between">
                      <span className="text-white font-semibold">Estimated total</span>
                      <span className="text-white font-bold text-lg">{formatCurrency(estimatedTotal)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</>
                    ) : (
                      <><ArrowRight className="w-4 h-4" /> Checkout</>
                    )}
                  </button>

                  <p className="text-gray-600 text-xs text-center mt-3">
                    Secure checkout · Powered by Stripe
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
