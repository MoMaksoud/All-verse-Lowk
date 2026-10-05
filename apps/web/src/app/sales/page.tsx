'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Truck,
  Download,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

interface OrderItem {
  listingId: string;
  title: string;
  qty: number;
  unitPrice: number;
  sellerId: string;
}

interface Order {
  id: string;
  buyerId: string;
  items: OrderItem[];
  subtotal: number;
  fees: number;
  tax: number;
  total: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentIntentId: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (typeof p.message === 'string' && p.message.trim()) return p.message;
    if (typeof p.error === 'string' && p.error.trim()) return p.error;
    if (typeof p.code === 'string' && p.code.trim()) return `${fallback} (${p.code})`;
  }
  return fallback;
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
    case 'delivered':
      return <CheckCircle2 strokeWidth={1.75} className="h-4 w-4" />;
    case 'shipped':
      return <Truck strokeWidth={1.75} className="h-4 w-4" />;
    default:
      return <Clock strokeWidth={1.75} className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
    case 'delivered':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'shipped':
      return 'border-primary-200 bg-primary-50 text-primary-700';
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700';
  }
};

interface ShippingInfo {
  trackingNumber?: string;
  labelUrl?: string;
  carrier?: string;
  service?: string;
  rateId?: string;
  shipmentId?: string;
  createdAt?: any;
  updatedAt?: any;
}

const SUCCESSFUL_ORDER_STATUSES = new Set(['paid', 'shipped', 'delivered']);

export default function SalesPage() {
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Order | null>(null);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    if (!db || !isFirebaseConfigured()) {
      console.error('Database not initialized');
      setError('Database is not configured. Please try again later.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Real-time subscription to orders where current user is a seller
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('sellerIds', 'array-contains', currentUser.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Filter orders where current user is the seller
        const salesList = snapshot.docs
          .map(doc => {
            const data = doc.data();
            const shippingAddress = data.shippingAddress && typeof data.shippingAddress === 'object'
              ? data.shippingAddress
              : {};
            return {
              id: doc.id,
              ...data,
              items: Array.isArray(data.items) ? data.items : [],
              shippingAddress: {
                name: (shippingAddress as any).name || 'N/A',
                street: (shippingAddress as any).street || 'N/A',
                city: (shippingAddress as any).city || '',
                state: (shippingAddress as any).state || '',
                zip: (shippingAddress as any).zip || '',
                country: (shippingAddress as any).country || 'N/A',
              },
              createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
          })
          .filter((order: any) => {
            // Check if any item in the order has this user as seller
            return (
              SUCCESSFUL_ORDER_STATUSES.has(order.status) &&
              order.items?.some((item: OrderItem) => item.sellerId === currentUser.uid)
            );
          })
          .map(order => {
            // Filter items to only show items sold by this seller
            const sellerItems = ((order as any).items || []).filter((item: OrderItem) =>
              item.sellerId === currentUser.uid
            );

            // Prorate fees/tax from the actual order amounts by seller's share of subtotal
            const sellerSubtotal = sellerItems.reduce((sum: number, item: OrderItem) =>
              sum + (item.unitPrice * item.qty), 0
            );
            const orderSubtotal = ((order as any).subtotal as number) || sellerSubtotal;
            const ratio = orderSubtotal > 0 ? sellerSubtotal / orderSubtotal : 1;
            const sellerTax = ((order as any).tax as number || 0) * ratio;
            const sellerFees = ((order as any).fees as number || 0) * ratio;
            const sellerTotal = sellerSubtotal + sellerTax + sellerFees;

            return {
              ...order,
              items: sellerItems,
              subtotal: sellerSubtotal,
              tax: sellerTax,
              fees: sellerFees,
              total: sellerTotal,
            } as Order;
          }) as Order[];

        setSales(salesList);
        setLoading(false);
      },
      (error) => {
        console.error('Error in sales subscription:', error);
        setError('Unable to load sales right now.');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Fetch shipping info when sale is selected
  useEffect(() => {
    if (selectedSale && db && isFirebaseConfigured()) {
      fetchShippingInfo(selectedSale.id);
    } else {
      setShippingInfo(null);
    }
  }, [selectedSale]);

  const fetchShippingInfo = async (orderId: string) => {
    setLoadingShipping(true);
    try {
      const shippingRef = collection(db, 'orders', orderId, 'shipping');
      const snapshot = await getDocs(shippingRef);

      if (!snapshot.empty) {
        const shippingData = snapshot.docs[0].data() as ShippingInfo;
        setShippingInfo(shippingData);
      } else {
        setShippingInfo(null);
      }
    } catch (error) {
      console.error('Error fetching shipping info:', error);
      setShippingInfo(null);
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleGenerateLabel = async () => {
    if (!selectedSale || generatingLabel) return;

    // Check if order has shipping metadata from payment intent
    const orderShipping = (selectedSale as any).shipping;
    if (!orderShipping?.rateId || !orderShipping?.shipmentId) {
      setError('Shipping rate information was not found for this sale.');
      return;
    }

    setGeneratingLabel(true);
    setError(null);
    try {
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/shipping/create-label', {
        rateId: orderShipping.rateId,
        shipmentId: orderShipping.shipmentId,
        orderId: selectedSale.id,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(errorData, 'Failed to generate shipping label'));
      }

      // Refresh shipping info
      await fetchShippingInfo(selectedSale.id);
    } catch (error) {
      console.error('Error generating label:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate shipping label');
    } finally {
      setGeneratingLabel(false);
    }
  };

  // Fetch Stripe Connect account status
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingAccount(false);
      return;
    }

    const fetchAccountStatus = async () => {
      try {
        const { apiGet } = await import('@/lib/api-client');
        const response = await apiGet('/api/stripe/connect/account-status');

        if (response.ok) {
          const data = await response.json();
          setStripeAccount(data);
        }
      } catch (error) {
        console.error('Error fetching account status:', error);
      } finally {
        setLoadingAccount(false);
      }
    };

    fetchAccountStatus();
  }, [currentUser?.uid]);

  const handleConnectStripe = async () => {
    if (!currentUser?.email) {
      setError('Email is required to connect Stripe');
      return;
    }

    try {
      setLoadingAccount(true);
      const { apiPost } = await import('@/lib/api-client');

      // Create account if doesn't exist
      const createResponse = await apiPost('/api/stripe/connect/create-account', {
        email: currentUser.email,
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(errorData, 'Failed to create Connect account'));
      }

      // Get account link
      const linkResponse = await apiPost('/api/stripe/connect/account-link', {
        returnUrl: window.location.href,
        refreshUrl: window.location.href,
      });

      if (!linkResponse.ok) {
        const errorData = await linkResponse.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(errorData, 'Failed to create account link'));
      }

      const linkData = await linkResponse.json();
      window.location.href = linkData.url;
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect Stripe account. Please try again.');
    } finally {
      setLoadingAccount(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6" aria-busy="true" aria-label="Loading">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-100" />
        <div className="mt-8 h-24 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Your sales</h1>
        <p className="mt-2 text-zinc-600">Sign in to see what you’ve sold and set up payouts.</p>
        <Link href="/signin?redirect=/sales&reason=sales" className="btn btn-primary mt-8 self-start">
          Sign in
        </Link>
      </div>
    );
  }

  // Calculate total earnings
  const totalEarnings = sales
    .filter(sale => sale.status === 'paid' || sale.status === 'shipped' || sale.status === 'delivered')
    .reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Your sales</h1>
        <p className="mt-2 text-zinc-600">What you’ve sold, what to ship, and when payouts arrive.</p>
      </header>

      {error && (
        <p role="alert" className="mt-6 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Payout setup */}
      {!loadingAccount && (!stripeAccount?.hasAccount || !stripeAccount?.payoutsEnabled) && (
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h2 className="font-semibold text-zinc-950">Connect Stripe to get paid</h2>
            <p className="mt-1 text-sm text-amber-900">
              {!stripeAccount?.hasAccount
                ? 'Payouts go to a Stripe account. Set one up before your first sale.'
                : 'Finish Stripe onboarding to turn on payouts.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleConnectStripe}
            disabled={loadingAccount}
            className="btn btn-primary shrink-0"
          >
            {loadingAccount ? 'Loading…' : 'Connect Stripe'}
          </button>
        </div>
      )}

      {/* Summary */}
      {!loading && sales.length > 0 && (
        <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-zinc-200 py-6 sm:max-w-md">
          <div>
            <dt className="text-sm text-zinc-500">Earned so far</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">{formatCurrency(totalEarnings)}</dd>
            {stripeAccount?.payoutsEnabled && (
              <dd className="mt-1 text-xs text-emerald-700">Payouts are on</dd>
            )}
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Sales</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">{sales.length}</dd>
          </div>
        </dl>
      )}

      {loading ? (
        <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200" aria-busy="true" aria-label="Loading sales">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-64 animate-pulse rounded bg-zinc-100" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="mt-10 flex flex-col items-start rounded-2xl border border-dashed border-zinc-300 p-8 sm:p-10">
          <Package strokeWidth={1.5} className="h-8 w-8 text-zinc-500" />
          <h2 className="mt-4 font-semibold text-zinc-950">No sales yet</h2>
          <p className="mt-1 max-w-[44ch] text-sm text-zinc-600">
            Once a buyer pays for one of your listings, it will show up here with its shipping details.
          </p>
          <Link href="/sell" className="btn btn-primary mt-6">List an item</Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          {sales.map((sale, i) => (
            <li key={sale.id} className="reveal py-6" style={{ '--i': i } as React.CSSProperties}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold text-zinc-950">Sale #{sale.id.slice(-8).toUpperCase()}</h2>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(sale.status)}`}>
                      {getStatusIcon(sale.status)}
                      {STATUS_LABEL[sale.status] ?? sale.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{formatDate(sale.createdAt)}</p>
                  <p className="mt-3 text-sm text-zinc-600">
                    {sale.items.map((item) => item.title).join(', ') || 'No items'}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                    <MapPin strokeWidth={1.75} className="h-3.5 w-3.5" />
                    {sale.shippingAddress.city ? `${sale.shippingAddress.city}, ${sale.shippingAddress.state}` : sale.shippingAddress.country}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-6 sm:flex-col sm:items-end">
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-zinc-950">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-zinc-500">after fees</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {sale.status === 'paid' && (sale as any).shipping?.rateId && (
                      <button
                        type="button"
                        onClick={() => setSelectedSale(sale)}
                        className="btn btn-primary gap-1.5 px-3 py-2 text-sm"
                      >
                        <Truck strokeWidth={1.75} className="h-3.5 w-3.5" />
                        Generate label
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedSale(sale)}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-0 sm:items-center sm:p-4"
          onClick={() => setSelectedSale(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-details-title"
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="sale-details-title" className="text-lg font-semibold text-zinc-950">
                  Sale #{selectedSale.id.slice(-8).toUpperCase()}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">{formatDate(selectedSale.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                aria-label="Close"
                className="rounded-md p-1 text-zinc-500 hover:text-zinc-950"
              >
                <XCircle strokeWidth={1.75} className="h-6 w-6" />
              </button>
            </div>

            <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(selectedSale.status)}`}>
              {getStatusIcon(selectedSale.status)}
              {STATUS_LABEL[selectedSale.status] ?? selectedSale.status}
            </span>

            <section className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-950">Items sold</h3>
              <ul className="mt-2 divide-y divide-zinc-200 border-y border-zinc-200">
                {selectedSale.items.map((item, index) => (
                  <li key={index} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-950">{item.title}</p>
                      <p className="text-zinc-500">
                        {formatCurrency(item.unitPrice)} × {item.qty}
                      </p>
                    </div>
                    <p className="font-medium tabular-nums text-zinc-950">{formatCurrency(item.unitPrice * item.qty)}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd className="tabular-nums text-zinc-900">{formatCurrency(selectedSale.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Tax</dt><dd className="tabular-nums text-zinc-900">{formatCurrency(selectedSale.tax)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Fees</dt><dd className="tabular-nums text-zinc-900">{formatCurrency(selectedSale.fees)}</dd></div>
                <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold"><dt className="text-zinc-950">You receive</dt><dd className="tabular-nums text-zinc-950">{formatCurrency(selectedSale.total)}</dd></div>
              </dl>
            </section>

            <section className="mt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <MapPin strokeWidth={1.75} className="h-4 w-4" />
                Ship to
              </h3>
              <div className="mt-2 text-sm text-zinc-700">
                <p className="font-medium text-zinc-950">{selectedSale.shippingAddress.name}</p>
                <p>{selectedSale.shippingAddress.street}</p>
                <p>
                  {selectedSale.shippingAddress.city}, {selectedSale.shippingAddress.state} {selectedSale.shippingAddress.zip}
                </p>
                <p>{selectedSale.shippingAddress.country}</p>
              </div>
            </section>

            <section className="mt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <Truck strokeWidth={1.75} className="h-4 w-4" />
                Shipping label
              </h3>
              <div className="mt-2 rounded-xl bg-zinc-50 p-4 text-sm">
                {loadingShipping ? (
                  <div className="space-y-2" aria-busy="true">
                    <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
                    <div className="h-4 w-32 animate-pulse rounded bg-zinc-200" />
                  </div>
                ) : shippingInfo?.trackingNumber ? (
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-zinc-500">Tracking number</dt>
                      <dd className="font-medium tabular-nums text-zinc-950">{shippingInfo.trackingNumber}</dd>
                    </div>
                    {shippingInfo.carrier && (
                      <div>
                        <dt className="text-zinc-500">Carrier</dt>
                        <dd className="text-zinc-950">{shippingInfo.carrier}{shippingInfo.service ? ` · ${shippingInfo.service}` : ''}</dd>
                      </div>
                    )}
                    {shippingInfo.labelUrl && (
                      <a
                        href={shippingInfo.labelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700"
                      >
                        <Download strokeWidth={1.75} className="h-4 w-4" />
                        Download label
                        <ExternalLink strokeWidth={1.75} className="h-3 w-3" />
                      </a>
                    )}
                  </dl>
                ) : (
                  <div className="space-y-3">
                    <p className="text-zinc-950">No label yet.</p>
                    {(selectedSale as any).shipping?.rateId && (selectedSale as any).shipping?.shipmentId ? (
                      <button
                        type="button"
                        onClick={handleGenerateLabel}
                        disabled={generatingLabel}
                        className="btn btn-primary gap-1.5 px-3 py-2 text-sm"
                      >
                        {generatingLabel ? (
                          <>
                            <Loader2 strokeWidth={1.75} className="h-3.5 w-3.5 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Truck strokeWidth={1.75} className="h-3.5 w-3.5" />
                            Generate shipping label
                          </>
                        )}
                      </button>
                    ) : (
                      <p className="text-zinc-500">Shipping details are missing for this sale. Contact info@allversegpt.com.</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            <p className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
              <Calendar strokeWidth={1.75} className="h-3.5 w-3.5" />
              Last updated {formatDate(selectedSale.updatedAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
