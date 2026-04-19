'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { DynamicBackground } from '@/components/DynamicBackground';
import dynamic from 'next/dynamic';
const CheckoutPage = dynamic(() => import('@/components/CheckoutForm'), {
  ssr: false,
  loading: () => null,
});
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { formatPrice } from '@/lib/format';

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
  const [updatingItems, setUpdatingItems] = useState<Record<string, boolean>>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.uid) {
      fetchCart();
    }
  }, [currentUser]);

  const fetchCart = async () => {
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
      const rawItems = Array.isArray(cart.items) ? cart.items : [];
      setCartItems(rawItems);

      // Fetch listing details for each cart item
      const { apiGet: apiGetPublic } = await import('@/lib/api-client');
      const listingPromises = rawItems.map(async (item: CartItem) => {
        const listingResponse = await apiGetPublic(`/api/listings/${item.listingId}`, { requireAuth: false });
        if (listingResponse.ok) {
          const listingData = await listingResponse.json();
          const listing = listingData.data || listingData;
          if (listing && typeof listing === 'object') {
            return { id: item.listingId, listing };
          }
        }
        return null;
      });

      const listingResults = await Promise.all(listingPromises);
      const listingsMap: Record<string, Listing> = {};
      
      listingResults.forEach(result => {
        if (result) {
          listingsMap[result.id] = result.listing;
        }
      });

      // Remove cart items whose listings are no longer available.
      const availableItems = rawItems.filter((item: CartItem) => !!listingsMap[item.listingId]);
      if (availableItems.length !== rawItems.length) {
        setCartItems(availableItems);
      }

      setListings(listingsMap);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (listingId: string, qty: number) => {
    if (updatingItems[listingId]) return;
    try {
      setUpdatingItems(prev => ({ ...prev, [listingId]: true }));
      const { apiPut } = await import('@/lib/api-client');
      const response = await apiPut('/api/carts', { listingId, qty });

      if (response.ok) {
        fetchCart(); // Refresh cart
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(getApiErrorMessage(errorData, 'Failed to update cart item'));
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      setError('Failed to update cart item');
    } finally {
      setUpdatingItems(prev => ({ ...prev, [listingId]: false }));
    }
  };

  const removeFromCart = async (listingId: string) => {
    if (updatingItems[listingId]) return;
    try {
      setUpdatingItems(prev => ({ ...prev, [listingId]: true }));
      const { apiDelete } = await import('@/lib/api-client');
      const response = await apiDelete(`/api/carts?listingId=${listingId}`);

      if (response.ok) {
        fetchCart(); // Refresh cart
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(getApiErrorMessage(errorData, 'Failed to remove item from cart'));
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      setError('Failed to remove item from cart');
    } finally {
      setUpdatingItems(prev => ({ ...prev, [listingId]: false }));
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.priceAtAdd * item.qty), 0);
  };

  const handleCheckout = () => {
    if (checkoutLoading || cartItems.length === 0) return;
    setCheckoutLoading(true);
    setShowCheckout(true);
  };

  const handleBackFromCheckout = () => {
    setCheckoutLoading(false);
    setShowCheckout(false);
    fetchCart(); // Refresh cart in case items were purchased
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <Navigation />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please sign in to view your cart</h1>
            <button
              onClick={() => router.push('/signin')}
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
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <Navigation />
        <div className="relative z-10 min-h-screen pt-20">
          <CheckoutPage cartItems={cartItems} onBack={handleBackFromCheckout} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="low" showParticles={true} />
      <Navigation />
      
      <div className="relative z-10 min-h-screen pt-20 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">Shopping Cart</h1>
            <p className="text-gray-400">Review your items before checkout</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-white mb-2">Unable to load cart</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <button
                onClick={fetchCart}
                className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Your cart is empty</h2>
              <p className="text-gray-400 mb-6">Add some items to get started!</p>
              <button
                onClick={() => router.push('/listings')}
                className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Browse Listings
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                  <h2 className="text-xl font-semibold text-white mb-6">Cart Items</h2>
                  <div className="space-y-4">
                    {cartItems.map((item) => {
                      const listing = listings[item.listingId];
                      if (!listing) return null;

                      return (
                        <div key={item.listingId} className="bg-dark-700 rounded-lg p-4">
                          <div className="flex items-center space-x-4">
                            {/* Image */}
                            <div className="w-20 h-20 bg-dark-600 rounded-lg flex items-center justify-center">
                              {listing.photos && listing.photos.length > 0 ? (
                                <img
                                  src={listing.photos[0]}
                                  alt={listing.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <ShoppingBag className="w-8 h-8 text-gray-500" />
                              )}
                            </div>

                            {/* Item Details */}
                            <div className="flex-1">
                              <h3 className="text-white font-medium">{listing.title}</h3>
                              <p className="text-gray-400 text-sm">{listing.category}</p>
                              <p className="text-gray-400 text-sm">Condition: {listing.condition}</p>
                              <p className="text-accent-500 font-semibold">{formatPrice(item.priceAtAdd)}</p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateCartItem(item.listingId, Math.max(1, item.qty - 1))}
                                disabled={!!updatingItems[item.listingId]}
                                className="w-8 h-8 bg-dark-600 hover:bg-dark-500 rounded-lg flex items-center justify-center text-white transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-white font-medium w-8 text-center">{item.qty}</span>
                              <button
                                onClick={() => updateCartItem(item.listingId, item.qty + 1)}
                                disabled={!!updatingItems[item.listingId]}
                                className="w-8 h-8 bg-dark-600 hover:bg-dark-500 rounded-lg flex items-center justify-center text-white transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => removeFromCart(item.listingId)}
                              disabled={!!updatingItems[item.listingId]}
                              className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center text-white transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700 sticky top-24">
                  <h2 className="text-xl font-semibold text-white mb-6">Order Summary</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal ({cartItems.length} items)</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Tax (8%)</span>
                      <span>{formatCurrency(calculateTotal() * 0.08)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Processing Fee</span>
                      <span>{formatCurrency(calculateTotal() * 0.029 + 0.30)}</span>
                    </div>
                    <div className="border-t border-dark-600 pt-3">
                      <div className="flex justify-between text-white font-semibold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(calculateTotal() * 1.08 + calculateTotal() * 0.029 + 0.30)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="w-full bg-accent-500 hover:bg-accent-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Opening Checkout...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Proceed to Checkout
                      </>
                    )}
                  </button>

                  <p className="text-gray-400 text-xs text-center mt-4">
                    Secure checkout powered by Stripe
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
