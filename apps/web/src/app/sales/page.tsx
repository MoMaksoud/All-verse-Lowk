'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { DynamicBackground } from '@/components/DynamicBackground';
import { Card } from '@/components/ui/Card';
import { 
  Package, 
  Calendar, 
  DollarSign, 
  MapPin, 
  CheckCircle, 
  Clock, 
  XCircle,
  Eye,
  Loader2,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'shipped':
      return <Package className="w-5 h-5 text-blue-500" />;
    case 'delivered':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'cancelled':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-yellow-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'text-green-400 bg-green-900/20 border-green-500/20';
    case 'shipped':
      return 'text-blue-400 bg-blue-900/20 border-blue-500/20';
    case 'delivered':
      return 'text-green-600 bg-green-900/20 border-green-600/20';
    case 'cancelled':
      return 'text-red-400 bg-red-900/20 border-red-500/20';
    default:
      return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20';
  }
};

export default function SalesPage() {
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Order | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time subscription to all orders
    // We'll filter client-side for orders where current user is the seller
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('💰 Sales subscription fired:', snapshot.docs.length, 'total orders');
        
        // Filter orders where current user is the seller
        const salesList = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
          })
          .filter((order: any) => {
            // Check if any item in the order has this user as seller
            return order.items?.some((item: OrderItem) => item.sellerId === currentUser.uid);
          })
          .map(order => {
            // Filter items to only show items sold by this seller
            const sellerItems = (order as any).items.filter((item: OrderItem) => 
              item.sellerId === currentUser.uid
            );
            
            // Calculate totals for seller's items only
            const sellerSubtotal = sellerItems.reduce((sum: number, item: OrderItem) => 
              sum + (item.unitPrice * item.qty), 0
            );
            const sellerTax = sellerSubtotal * 0.08; // 8% tax
            const sellerFees = sellerSubtotal * 0.029 + 0.30; // Stripe fees
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

        console.log(`✅ Found ${salesList.length} sales for seller ${currentUser.uid}`);
        setSales(salesList);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in sales subscription:', error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [currentUser?.uid]);

  if (!currentUser) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <Navigation />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please sign in to view your sales</h1>
            <Link
              href="/signin"
              className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total earnings
  const totalEarnings = sales
    .filter(sale => sale.status === 'paid' || sale.status === 'shipped' || sale.status === 'delivered')
    .reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="low" showParticles={true} />
      <Navigation />
      
      <div className="relative z-10 min-h-screen pt-20 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">My Sales</h1>
            <p className="text-gray-400">Track your sold items and earnings</p>
          </div>

          {/* Earnings Summary */}
          {sales.length > 0 && (
            <Card className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Total Earnings</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalEarnings)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Total Sales</p>
                  <p className="text-xl font-semibold text-accent-400">{sales.length}</p>
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">No sales yet</h2>
                <p className="text-zinc-400 mb-6">You haven't sold any items yet.</p>
                <Link
                  href="/sell"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Create Listing
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {sales.map((sale) => (
                <Card key={sale.id}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        Sale #{sale.id.slice(-8).toUpperCase()}
                      </h3>
                      <div className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center gap-2 ${getStatusColor(sale.status)}`}>
                        {getStatusIcon(sale.status)}
                        {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-accent-500 font-semibold text-lg">
                        {formatCurrency(sale.total)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {formatDate(sale.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sold Items */}
                    <div>
                      <h4 className="text-white font-medium mb-3">Items Sold ({sale.items.length})</h4>
                      <div className="space-y-2">
                        {sale.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex-1">
                              <p className="text-white">{item.title}</p>
                              <p className="text-gray-400">Qty: {item.qty}</p>
                            </div>
                            <p className="text-gray-300">
                              {formatCurrency(item.unitPrice * item.qty)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div>
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Shipping Address
                      </h4>
                      <div className="text-sm text-gray-300">
                        <p>{sale.shippingAddress.name}</p>
                        <p>{sale.shippingAddress.street}</p>
                        <p>
                          {sale.shippingAddress.city}, {sale.shippingAddress.state} {sale.shippingAddress.zip}
                        </p>
                        <p>{sale.shippingAddress.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sale Summary */}
                  <div className="mt-6 pt-6 border-t border-dark-600">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-400">
                        <p>Subtotal: {formatCurrency(sale.subtotal)}</p>
                        <p>Tax: {formatCurrency(sale.tax)}</p>
                        <p>Fees: {formatCurrency(sale.fees)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold text-lg">
                          Total: {formatCurrency(sale.total)}
                        </p>
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="mt-2 text-accent-400 hover:text-accent-300 text-sm flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Sale Details #{selectedSale.id.slice(-8).toUpperCase()}
              </h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-zinc-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="text-zinc-400">Status:</span>
                <div className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center gap-2 ${getStatusColor(selectedSale.status)}`}>
                  {getStatusIcon(selectedSale.status)}
                  {selectedSale.status.charAt(0).toUpperCase() + selectedSale.status.slice(1)}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-white font-medium mb-3">Items Sold</h4>
                <div className="space-y-3">
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="bg-zinc-800 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-white font-medium">{item.title}</h5>
                          <p className="text-zinc-400 text-sm">Listing ID: {item.listingId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {formatCurrency(item.unitPrice)} × {item.qty}
                          </p>
                          <p className="text-accent-500 font-semibold">
                            {formatCurrency(item.unitPrice * item.qty)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping Address
                </h4>
                <div className="bg-zinc-800 rounded-xl p-4">
                  <div className="text-zinc-300">
                    <p className="font-medium">{selectedSale.shippingAddress.name}</p>
                    <p>{selectedSale.shippingAddress.street}</p>
                    <p>
                      {selectedSale.shippingAddress.city}, {selectedSale.shippingAddress.state} {selectedSale.shippingAddress.zip}
                    </p>
                    <p>{selectedSale.shippingAddress.country}</p>
                  </div>
                </div>
              </div>

              {/* Sale Summary */}
              <div>
                <h4 className="text-white font-medium mb-3">Sale Summary</h4>
                <div className="bg-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Subtotal:</span>
                    <span className="text-white">{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Tax:</span>
                    <span className="text-white">{formatCurrency(selectedSale.tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Fees:</span>
                    <span className="text-white">{formatCurrency(selectedSale.fees)}</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2">
                    <div className="flex justify-between">
                      <span className="text-white font-semibold">Total:</span>
                      <span className="text-accent-500 font-semibold text-lg">
                        {formatCurrency(selectedSale.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Sold: {formatDate(selectedSale.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Updated: {formatDate(selectedSale.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

