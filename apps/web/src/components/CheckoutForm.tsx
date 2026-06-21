'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CreditCard,
  ShoppingBag,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Truck,
  Store,
} from 'lucide-react';

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

interface CheckoutFormProps {
  cartItems: CartItem[];
  onError: (error: string) => void;
}

interface ShippingRate {
  id?: string;
  serviceName: string;
  carrier: string;
  price: number;
  currency: string;
  deliveryDays?: number;
}

interface SellerShippingState {
  rates: ShippingRate[];
  selected: ShippingRate | null;
  shipmentId: string | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_SHIPPING: SellerShippingState = {
  rates: [],
  selected: null,
  shipmentId: null,
  loading: false,
  error: null,
};

const CheckoutForm: React.FC<CheckoutFormProps> = ({ cartItems, onError }) => {
  const { currentUser } = useAuth();
  const [payingSellerId, setPayingSellerId] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    name: currentUser?.displayName || '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [sellerShipping, setSellerShipping] = useState<Record<string, SellerShippingState>>({});

  // Group cart items by seller — each seller is a separate order + payment.
  const sellerGroups = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of cartItems) {
      if (!map.has(item.sellerId)) map.set(item.sellerId, []);
      map.get(item.sellerId)!.push(item);
    }
    return [...map.entries()].map(([sellerId, items]) => ({
      sellerId,
      sellerName: sellerNames[sellerId] || 'Seller',
      items,
      subtotal: items.reduce((s, i) => s + i.priceAtAdd * i.qty, 0),
    }));
  }, [cartItems, sellerNames]);

  const multiSeller = sellerGroups.length > 1;

  // Fetch seller display names once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { apiGet } = await import('@/lib/api-client');
      const uniqueSellerIds = [...new Set(cartItems.map((i) => i.sellerId).filter(Boolean))];
      const entries = await Promise.all(
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
      if (!cancelled) setSellerNames(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [cartItems]);

  const fetchRatesForSeller = useCallback(
    async (sellerId: string, items: CartItem[]) => {
      const toZip = shippingAddress.zip.replace(/[^\d]/g, '').slice(0, 5);
      if (toZip.length < 5) return;

      setSellerShipping((prev) => ({
        ...prev,
        [sellerId]: { ...(prev[sellerId] ?? EMPTY_SHIPPING), loading: true, error: null },
      }));

      try {
        const { apiGet, apiPost } = await import('@/lib/api-client');

        // Package dimensions from the first listing that has them.
        const listingDetails = await Promise.all(
          items.map(async (item) => {
            const response = await apiGet(`/api/listings/${item.listingId}`, { requireAuth: false });
            if (response.ok) {
              const payload = await response.json();
              return payload?.data || payload || null;
            }
            return null;
          })
        );
        const firstWithShipping = listingDetails.find(
          (l) => l && typeof l === 'object' && (l as any).shipping
        );
        const dims = (firstWithShipping as any)?.shipping || { weight: 2, length: 12, width: 8, height: 6 };

        // Seller origin ZIP.
        let fromZip = '10001';
        try {
          const sellerResponse = await apiGet(`/api/profile?userId=${sellerId}`, { requireAuth: false });
          if (sellerResponse.ok) {
            const sellerData = await sellerResponse.json();
            fromZip = sellerData.data?.shippingAddress?.zip || '10001';
          }
        } catch {
          // use fallback
        }

        const ratesResponse = await apiPost('/api/shipping/get-rates', {
          weight: dims.weight || 2,
          length: dims.length || 12,
          width: dims.width || 8,
          height: dims.height || 6,
          fromZip: String(fromZip).replace(/[^\d]/g, '').slice(0, 5) || '10001',
          toZip,
        });

        if (!ratesResponse.ok) {
          const errorData = await ratesResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch shipping rates');
        }

        const ratesData = await ratesResponse.json();
        const rates: ShippingRate[] = Array.isArray(ratesData.rates) ? ratesData.rates : [];

        setSellerShipping((prev) => ({
          ...prev,
          [sellerId]: {
            rates,
            selected: rates.length > 0 ? rates[0] : null,
            shipmentId: typeof ratesData.shipmentId === 'string' ? ratesData.shipmentId : null,
            loading: false,
            error: rates.length === 0 ? 'No shipping rates available for this address.' : null,
          },
        }));
      } catch (error) {
        setSellerShipping((prev) => ({
          ...prev,
          [sellerId]: {
            ...EMPTY_SHIPPING,
            error: error instanceof Error ? error.message : 'Failed to load shipping rates',
          },
        }));
      }
    },
    [shippingAddress.zip]
  );

  // When ZIP is valid, quote shipping for every seller.
  useEffect(() => {
    const toZip = shippingAddress.zip.replace(/[^\d]/g, '');
    if (toZip.length >= 5 && sellerGroups.length > 0) {
      sellerGroups.forEach((group) => fetchRatesForSeller(group.sellerId, group.items));
    } else {
      setSellerShipping({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingAddress.zip, cartItems]);

  const computeSellerTotals = (group: { subtotal: number; sellerId: string }) => {
    const subtotal = group.subtotal;
    const tax = subtotal * 0.08;
    const shipping = sellerShipping[group.sellerId]?.selected?.price || 0;
    const fees = (subtotal + tax + shipping) * 0.029 + 0.3;
    const total = subtotal + tax + fees + shipping;
    return { subtotal, tax, shipping, fees, total };
  };

  const addressComplete =
    !!shippingAddress.name &&
    !!shippingAddress.street &&
    !!shippingAddress.city &&
    !!shippingAddress.state &&
    shippingAddress.zip.replace(/[^\d]/g, '').length >= 5;

  const handleSellerCheckout = async (sellerId: string) => {
    if (payingSellerId) return;

    if (!addressComplete) {
      onError('Please complete your shipping address before checkout.');
      return;
    }
    const ship = sellerShipping[sellerId];
    if (!ship?.selected) {
      onError('Please select a shipping option for this seller.');
      return;
    }

    setPayingSellerId(sellerId);
    try {
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/payments/create-checkout-session', {
        sellerId,
        shippingAddress,
        selectedShipping: {
          rateId: ship.selected.id,
          shipmentId: ship.shipmentId,
          carrier: ship.selected.carrier,
          serviceName: ship.selected.serviceName,
          price: ship.selected.price,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || (data as { success?: boolean }).success === false) {
        throw new Error(getApiErrorMessage(data, 'Failed to create checkout session'));
      }

      const checkoutUrl = (data as { url?: string }).url;
      if (typeof checkoutUrl === 'string' && checkoutUrl.trim()) {
        window.location.href = checkoutUrl;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Checkout failed');
      setPayingSellerId(null);
    }
  };

  const renderShippingOptions = (sellerId: string) => {
    const state = sellerShipping[sellerId] ?? EMPTY_SHIPPING;
    const zipValid = shippingAddress.zip.replace(/[^\d]/g, '').length >= 5;

    if (!zipValid) {
      return <p className="text-gray-400 text-sm">Enter your ZIP above to see shipping options.</p>;
    }
    if (state.loading) {
      return (
        <div className="flex items-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-accent-500 mr-2" />
          <span className="text-gray-300 text-sm">Loading shipping rates…</span>
        </div>
      );
    }
    if (state.error) {
      return (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{state.error}</p>
        </div>
      );
    }
    if (state.rates.length === 0) {
      return <p className="text-gray-400 text-sm">No shipping rates available for this address.</p>;
    }

    return (
      <div className="space-y-2">
        {state.rates.map((rate, index) => {
          const tierName = rate.serviceName;
          const isSelected = state.selected === rate;
          const isRecommended = tierName.toLowerCase().startsWith('standard');

          let deliveryWindow = '';
          if (tierName.toLowerCase().startsWith('economy')) deliveryWindow = '3–5 days';
          else if (tierName.toLowerCase().startsWith('standard')) deliveryWindow = '2–3 days';
          else if (tierName.toLowerCase().startsWith('express')) deliveryWindow = '1–2 days';
          else if (tierName.toLowerCase().startsWith('overnight')) deliveryWindow = '1 day';
          else if (rate.deliveryDays)
            deliveryWindow = `${rate.deliveryDays} ${rate.deliveryDays === 1 ? 'day' : 'days'}`;

          return (
            <button
              key={index}
              type="button"
              onClick={() =>
                setSellerShipping((prev) => ({
                  ...prev,
                  [sellerId]: { ...(prev[sellerId] ?? EMPTY_SHIPPING), selected: rate },
                }))
              }
              className={`w-full text-left rounded-xl border px-4 py-3 transition-all flex items-center justify-between gap-4 ${
                isSelected
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-dark-500 bg-dark-600 hover:border-dark-400 hover:bg-dark-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-accent-500' : 'border-gray-500'
                  }`}
                >
                  {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-accent-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{tierName}</span>
                    {isRecommended && (
                      <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-medium text-accent-300 border border-accent-500/40">
                        Recommended
                      </span>
                    )}
                  </div>
                  {deliveryWindow && <p className="mt-0.5 text-sm text-gray-400">{deliveryWindow}</p>}
                </div>
              </div>
              <p className="text-base font-semibold text-white">{formatCurrency(rate.price)}</p>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Shipping Address (shared) */}
      <div className="bg-dark-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Shipping Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              value={shippingAddress.name}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
            <input
              type="text"
              value={shippingAddress.street}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, street: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
            <input
              type="text"
              value={shippingAddress.city}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
            <input
              type="text"
              value={shippingAddress.state}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, state: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
            <input
              type="text"
              value={shippingAddress.zip}
              onChange={(e) =>
                setShippingAddress((prev) => ({ ...prev, zip: e.target.value.replace(/[^\d\s-]/g, '') }))
              }
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
            <select
              value={shippingAddress.country}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, country: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </div>
      </div>

      {multiSeller && (
        <div className="flex items-start gap-3 bg-accent-500/10 border border-accent-500/40 rounded-lg p-4">
          <Store className="w-5 h-5 text-accent-300 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed">
            Your bag has {sellerGroups.length} sellers. Each is a separate order with its own shipping
            and is paid for separately. Check out each seller below.
          </p>
        </div>
      )}

      {/* Per-seller groups */}
      {sellerGroups.map((group, index) => {
        const totals = computeSellerTotals(group);
        const ship = sellerShipping[group.sellerId];
        const isPaying = payingSellerId === group.sellerId;
        const canPay = addressComplete && !!ship?.selected && !payingSellerId;

        return (
          <div key={group.sellerId} className="bg-dark-700 rounded-lg p-6 space-y-5">
            {/* Seller header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Store className="w-5 h-5 text-accent-500 shrink-0" />
                <span className="font-semibold text-white truncate">{group.sellerName}</span>
              </div>
              {multiSeller && (
                <span className="text-xs text-gray-500">
                  Order {index + 1} of {sellerGroups.length}
                </span>
              )}
            </div>

            {/* Shipping */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                <Truck className="w-4 h-4 mr-2 text-accent-500" />
                Shipping
              </h4>
              {renderShippingOptions(group.sellerId)}
            </div>

            {/* Summary */}
            <div className="border-t border-dark-500 pt-4 space-y-2">
              <div className="flex justify-between text-gray-300 text-sm">
                <span>Subtotal ({group.items.length} {group.items.length === 1 ? 'item' : 'items'})</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.shipping > 0 && (
                <div className="flex justify-between text-gray-300 text-sm">
                  <span>Shipping</span>
                  <span>{formatCurrency(totals.shipping)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-300 text-sm">
                <span>Tax</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-gray-300 text-sm">
                <span>Processing Fee</span>
                <span>{formatCurrency(totals.fees)}</span>
              </div>
              <div className="flex justify-between text-white font-semibold text-base pt-1">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {/* Per-seller checkout button */}
            <button
              type="button"
              onClick={() => handleSellerCheckout(group.sellerId)}
              disabled={!canPay}
              className="w-full bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {isPaying ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirecting to Checkout…
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  {multiSeller
                    ? `Pay ${group.sellerName} — ${formatCurrency(totals.total)}`
                    : `Proceed to Stripe Checkout — ${formatCurrency(totals.total)}`}
                </>
              )}
            </button>
          </div>
        );
      })}

      <p className="text-gray-500 text-xs text-center flex items-center justify-center gap-1.5">
        <ShoppingBag className="w-3.5 h-3.5" />
        Secure checkout · Powered by Stripe
      </p>
    </div>
  );
};

interface CheckoutPageProps {
  cartItems: CartItem[];
  onBack: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItems, onBack }) => {
  const router = useRouter();
  const [status, setStatus] = useState<'checkout' | 'success' | 'error'>('checkout');
  const [message, setMessage] = useState('');

  const handleError = (error: string) => {
    setStatus('error');
    setMessage(error);
  };

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          <button
            onClick={() => router.push('/orders')}
            className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            View Orders
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          <div className="space-x-4">
            <button
              onClick={() => setStatus('checkout')}
              className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onBack}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-400 hover:text-white transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-white">Checkout</h1>
      </div>

      <CheckoutForm cartItems={cartItems} onError={handleError} />
    </div>
  );
};

export default CheckoutPage;
