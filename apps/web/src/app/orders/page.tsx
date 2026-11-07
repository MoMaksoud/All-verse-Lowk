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

const STATUS_LABEL: Record<string, string> = {
  pending: 'Processing',
  paid: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
    case 'delivered':
      return <CheckCircle2 strokeWidth={1.75} className="h-4 w-4" />;
    case 'shipped':
      return <Truck strokeWidth={1.75} className="h-4 w-4" />;
    case 'cancelled':
      return <XCircle strokeWidth={1.75} className="h-4 w-4" />;
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
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-700';
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

const ALL_ORDER_STATUSES = new Set(['pending', 'paid', 'shipped', 'delivered', 'cancelled']);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

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

    // Real-time subscription to orders
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('buyerId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersList = snapshot.docs
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
          .filter((order: any) => ALL_ORDER_STATUSES.has(order.status)) as Order[];

        setOrders(ordersList);
        setLoading(false);
      },
      (error) => {
        console.error('Error in orders subscription:', error);
        setError('Unable to load orders right now.');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Fetch shipping info when order is selected
  useEffect(() => {
    if (selectedOrder && db && isFirebaseConfigured()) {
      fetchShippingInfo(selectedOrder.id);
    } else {
      setShippingInfo(null);
    }
  }, [selectedOrder]);

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

  if (!currentUser) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Your orders</h1>
        <p className="mt-2 text-zinc-600">Sign in to see what you’ve bought and where it is.</p>
        <Link href="/signin?redirect=/orders&reason=orders" className="btn btn-primary mt-8 self-start">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Your orders</h1>
        <p className="mt-2 text-zinc-600">Purchases, payment and delivery status.</p>
      </header>

      {error && (
        <p role="alert" className="mt-6 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {loading ? (
        <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200" aria-busy="true" aria-label="Loading orders">
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
      ) : orders.length === 0 ? (
        <div className="mt-10 flex flex-col items-start rounded-2xl border border-dashed border-zinc-300 p-8 sm:p-10">
          <Package strokeWidth={1.5} className="h-8 w-8 text-zinc-500" />
          <h2 className="mt-4 font-semibold text-zinc-950">No orders yet</h2>
          <p className="mt-1 max-w-[44ch] text-sm text-zinc-600">
            Items you buy will show up here with their payment and delivery status.
          </p>
          <Link href="/listings" className="btn btn-primary mt-6">Browse listings</Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          {orders.map((order, i) => (
            <li key={order.id} className="reveal py-6" style={{ '--i': i } as React.CSSProperties}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold text-zinc-950">Order #{order.id.slice(-8).toUpperCase()}</h2>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{formatDate(order.createdAt)}</p>
                  <p className="mt-3 text-sm text-zinc-600">
                    {order.items.map((item) => item.title).join(', ') || 'No items'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-6 sm:flex-col sm:items-end">
                  <p className="font-semibold tabular-nums text-zinc-950">{formatCurrency(order.total)}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {order.status === 'shipped' ? 'Track package' : 'View details'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-0 sm:items-center sm:p-4"
          onClick={() => setSelectedOrder(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="order-details-title" className="text-lg font-semibold text-zinc-950">
                  Order #{selectedOrder.id.slice(-8).toUpperCase()}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close"
                className="rounded-md p-1 text-zinc-500 hover:text-zinc-950"
              >
                <XCircle strokeWidth={1.75} className="h-6 w-6" />
              </button>
            </div>

            <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
              {getStatusIcon(selectedOrder.status)}
              {STATUS_LABEL[selectedOrder.status] ?? selectedOrder.status}
            </span>

            <section className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-950">Items</h3>
              <ul className="mt-2 divide-y divide-zinc-200 border-y border-zinc-200">
                {selectedOrder.items.map((item, index) => (
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
                <div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd className="tabular-nums text-zinc-900">{formatCurrency(selectedOrder.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Tax</dt><dd className="tabular-nums text-zinc-900">{formatCurrency(selectedOrder.tax)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Fees</dt><dd className="tabular-nums text-zinc-900">{formatCurrency(selectedOrder.fees)}</dd></div>
                <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold"><dt className="text-zinc-950">Total</dt><dd className="tabular-nums text-zinc-950">{formatCurrency(selectedOrder.total)}</dd></div>
              </dl>
            </section>

            <section className="mt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <MapPin strokeWidth={1.75} className="h-4 w-4" />
                Shipping to
              </h3>
              <div className="mt-2 text-sm text-zinc-700">
                <p className="font-medium text-zinc-950">{selectedOrder.shippingAddress.name}</p>
                <p>{selectedOrder.shippingAddress.street}</p>
                <p>
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zip}
                </p>
                <p>{selectedOrder.shippingAddress.country}</p>
              </div>
            </section>

            <section className="mt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <Truck strokeWidth={1.75} className="h-4 w-4" />
                Delivery
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
                    <div>
                      <dt className="text-zinc-500">Status</dt>
                      <dd className="text-zinc-950">
                        {selectedOrder.status === 'delivered' ? 'Delivered' : selectedOrder.status === 'shipped' ? 'On the way' : 'Label created'}
                      </dd>
                      <dd className="mt-1 text-xs text-zinc-500">Check the carrier’s site for live tracking.</dd>
                    </div>
                    {shippingInfo.labelUrl && (
                      <a
                        href={shippingInfo.labelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700"
                      >
                        <Download strokeWidth={1.75} className="h-4 w-4" />
                        Shipping label
                        <ExternalLink strokeWidth={1.75} className="h-3 w-3" />
                      </a>
                    )}
                  </dl>
                ) : (
                  <div>
                    <p className="text-zinc-950">The seller is preparing your order.</p>
                    <p className="mt-1 text-zinc-500">A tracking number will appear here once it ships.</p>
                  </div>
                )}
              </div>
            </section>

            <p className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
              <Calendar strokeWidth={1.75} className="h-3.5 w-3.5" />
              Last updated {formatDate(selectedOrder.updatedAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
