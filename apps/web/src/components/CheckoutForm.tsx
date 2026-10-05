'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, AlertCircle, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { calculateCheckoutTotals } from '@/lib/payments/pricing';

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

type Address = { name: string; street: string; city: string; state: string; zip: string; country: string };

const FIELDS: { key: keyof Address; label: string; autoComplete: string; span?: boolean; inputMode?: 'numeric' }[] = [
  { key: 'name', label: 'Full name', autoComplete: 'name', span: true },
  { key: 'street', label: 'Street address', autoComplete: 'street-address', span: true },
  { key: 'city', label: 'City', autoComplete: 'address-level2' },
  { key: 'state', label: 'State', autoComplete: 'address-level1' },
  { key: 'zip', label: 'ZIP code', autoComplete: 'postal-code', inputMode: 'numeric' },
];

const inputClass =
  'h-11 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10';

const deliveryWindow = (rate: ShippingRate) => {
  const t = rate.serviceName.toLowerCase();
  if (t.startsWith('economy')) return '3–5 days';
  if (t.startsWith('standard')) return '2–3 days';
  if (t.startsWith('express')) return '1–2 days';
  if (t.startsWith('overnight')) return '1 day';
  if (rate.deliveryDays) return `${rate.deliveryDays} ${rate.deliveryDays === 1 ? 'day' : 'days'}`;
  return '';
};

interface CheckoutPageProps {
  cartItems: CartItem[];
  onBack: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItems, onBack }) => {
  const { currentUser } = useAuth();
  const [payingSellerId, setPayingSellerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<Address>({
    name: currentUser?.displayName || '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [sellerShipping, setSellerShipping] = useState<Record<string, SellerShippingState>>({});

  const zipDigits = shippingAddress.zip.replace(/[^\d]/g, '');
  const zipValid = zipDigits.length >= 5;

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
          throw new Error(errorData.error || 'Couldn’t load shipping options.');
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
            error: rates.length === 0 ? 'No shipping options for this address.' : null,
          },
        }));
      } catch (error) {
        setSellerShipping((prev) => ({
          ...prev,
          [sellerId]: {
            ...EMPTY_SHIPPING,
            error: error instanceof Error ? error.message : 'Couldn’t load shipping options.',
          },
        }));
      }
    },
    [shippingAddress.zip]
  );

  // When ZIP is valid, quote shipping for every seller.
  useEffect(() => {
    if (zipValid && sellerGroups.length > 0) {
      sellerGroups.forEach((group) => fetchRatesForSeller(group.sellerId, group.items));
    } else {
      setSellerShipping({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingAddress.zip, cartItems]);

  const missing = (key: keyof Address) => (key === 'zip' ? !zipValid : !shippingAddress[key].trim());
  const addressComplete = FIELDS.every((f) => !missing(f.key));

  const handleSellerCheckout = async (sellerId: string) => {
    if (payingSellerId) return;
    setError(null);

    if (!addressComplete) {
      setShowErrors(true);
      setError('Add your shipping address to continue.');
      return;
    }
    const ship = sellerShipping[sellerId];
    if (!ship?.selected) {
      setError('Pick a shipping option first.');
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
        throw new Error(getApiErrorMessage(data, 'Couldn’t start checkout.'));
      }

      const checkoutUrl = (data as { url?: string }).url;
      if (typeof checkoutUrl === 'string' && checkoutUrl.trim()) {
        window.location.href = checkoutUrl;
        return;
      }
      throw new Error('Couldn’t start checkout.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Checkout failed.');
      setPayingSellerId(null);
    }
  };

  const selectRate = (sellerId: string, rate: ShippingRate) =>
    setSellerShipping((prev) => ({
      ...prev,
      [sellerId]: { ...(prev[sellerId] ?? EMPTY_SHIPPING), selected: rate },
    }));

  return (
    <div className="mx-auto min-h-[70dvh] w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-950">
        <ArrowLeft strokeWidth={1.75} className="h-4 w-4" /> Back to cart
      </button>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">Checkout</h1>

      {error && (
        <div role="alert" className="mt-6 flex max-w-xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
        {/* Address */}
        <section aria-labelledby="ship-to">
          <h2 id="ship-to" className="font-semibold text-zinc-950">Ship to</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => {
              const invalid = showErrors && missing(f.key);
              return (
                <div key={f.key} className={clsx('flex flex-col gap-2', f.span && 'sm:col-span-2')}>
                  <label htmlFor={`addr-${f.key}`} className="text-sm font-medium text-zinc-800">{f.label}</label>
                  <input
                    id={`addr-${f.key}`}
                    type="text"
                    autoComplete={f.autoComplete}
                    inputMode={f.inputMode}
                    value={shippingAddress[f.key]}
                    onChange={(e) => {
                      const v = f.key === 'zip' ? e.target.value.replace(/[^\d\s-]/g, '') : e.target.value;
                      setShippingAddress((prev) => ({ ...prev, [f.key]: v }));
                    }}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? `addr-${f.key}-err` : undefined}
                    className={clsx(inputClass, invalid ? 'border-red-400' : 'border-zinc-300')}
                  />
                  {invalid && (
                    <p id={`addr-${f.key}-err`} className="text-xs text-red-600">
                      {f.key === 'zip' ? 'Enter a 5-digit ZIP code.' : 'Required.'}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="flex flex-col gap-2">
              <label htmlFor="addr-country" className="text-sm font-medium text-zinc-800">Country</label>
              <select
                id="addr-country"
                autoComplete="country"
                value={shippingAddress.country}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, country: e.target.value }))}
                className={clsx(inputClass, 'border-zinc-300')}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
          </div>
        </section>

        {/* Orders, one per seller */}
        <div className="space-y-6">
          {multiSeller && (
            <p className="text-sm text-zinc-600">
              Your cart has {sellerGroups.length} sellers. Each one ships and is paid for separately.
            </p>
          )}

          {sellerGroups.map((group, index) => {
            const ship = sellerShipping[group.sellerId] ?? EMPTY_SHIPPING;
            const totals = calculateCheckoutTotals(group.subtotal, ship.selected?.price || 0);
            const isPaying = payingSellerId === group.sellerId;

            return (
              <section key={group.sellerId} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm text-zinc-500">
                    From <span className="font-medium text-zinc-950">{group.sellerName}</span>
                  </h2>
                  {multiSeller && (
                    <span className="text-xs text-zinc-500">Order {index + 1} of {sellerGroups.length}</span>
                  )}
                </div>

                <fieldset className="mt-5">
                  <legend className="text-sm font-medium text-zinc-800">Delivery</legend>
                  <div className="mt-3">
                    {!zipValid ? (
                      <p className="text-sm text-zinc-500">Enter your ZIP code to see delivery options.</p>
                    ) : ship.loading ? (
                      <div className="space-y-2" aria-busy="true">
                        <div className="h-14 animate-pulse rounded-lg bg-zinc-200/70" />
                        <div className="h-14 animate-pulse rounded-lg bg-zinc-200/70" />
                      </div>
                    ) : ship.error ? (
                      <div className="text-sm">
                        <p className="text-red-600">{ship.error}</p>
                        <button
                          onClick={() => fetchRatesForSeller(group.sellerId, group.items)}
                          className="mt-1 font-medium text-primary-700 hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ship.rates.map((rate, i) => {
                          const selected = ship.selected === rate;
                          const eta = deliveryWindow(rate);
                          return (
                            <label
                              key={rate.id ?? i}
                              className={clsx(
                                'flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3 transition',
                                selected ? 'border-primary-600 ring-1 ring-primary-600' : 'border-zinc-200 hover:border-zinc-300'
                              )}
                            >
                              <input
                                type="radio"
                                name={`ship-${group.sellerId}`}
                                checked={selected}
                                onChange={() => selectRate(group.sellerId, rate)}
                                className="h-4 w-4 accent-primary-600"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-zinc-950">{rate.serviceName}</span>
                                {eta && <span className="block text-xs text-zinc-500">{eta}</span>}
                              </span>
                              <span className="text-sm font-medium tabular-nums text-zinc-950">{formatCurrency(rate.price)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </fieldset>

                <dl className="mt-6 space-y-2 border-t border-zinc-200 pt-4 text-sm">
                  {[
                    [`Items (${group.items.length})`, formatCurrency(totals.subtotal)],
                    ['Shipping', ship.selected ? formatCurrency(totals.shipping) : '—'],
                    ['Estimated tax', formatCurrency(totals.tax)],
                    ['Card processing', formatCurrency(totals.fees)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-zinc-600">{k}</dt>
                      <dd className="tabular-nums text-zinc-950">{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2">
                    <dt className="font-medium text-zinc-950">Total</dt>
                    <dd className="text-lg font-semibold tabular-nums text-zinc-950">{formatCurrency(totals.total)}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => handleSellerCheckout(group.sellerId)}
                  disabled={!!payingSellerId || ship.loading}
                  className="btn btn-primary mt-5 w-full gap-2 py-3"
                >
                  {isPaying ? (
                    <><Loader2 strokeWidth={2} className="h-4 w-4 animate-spin" /> Opening Stripe…</>
                  ) : (
                    <><Lock strokeWidth={1.75} className="h-4 w-4" /> Pay {formatCurrency(totals.total)}</>
                  )}
                </button>
              </section>
            );
          })}

          <p className="flex gap-2 text-xs leading-relaxed text-zinc-500">
            <ShieldCheck strokeWidth={1.75} className="h-4 w-4 shrink-0 text-primary-600" />
            You’ll enter your card on Stripe’s secure page. AllVerse never sees your card number.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
