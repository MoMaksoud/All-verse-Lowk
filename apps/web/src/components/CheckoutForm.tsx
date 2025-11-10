'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { 
  CreditCard, 
  ShoppingBag, 
  ArrowLeft, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CartItem {
  listingId: string;
  sellerId: string;
  qty: number;
  priceAtAdd: number;
}

interface CheckoutFormProps {
  cartItems: CartItem[];
  onSuccess: (orderId: string) => void;
  onError: (error: string) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ cartItems, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: currentUser?.displayName || '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    tax: 0,
    fees: 0,
    total: 0,
  });

  useEffect(() => {
    calculateTotals();
  }, [cartItems]);

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.priceAtAdd * item.qty), 0);
    const tax = subtotal * 0.08; // 8% tax
    const fees = subtotal * 0.029 + 0.30; // Stripe fees
    const total = subtotal + tax + fees;

    setTotals({ subtotal, tax, fees, total });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/payments/create-intent', {
        cartItems,
        shippingAddress,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // Confirm payment
      const { error } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: shippingAddress.name,
            address: {
              line1: shippingAddress.street,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.zip,
              country: shippingAddress.country,
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Confirm payment on server
      const { apiPost: apiPostConfirm } = await import('@/lib/api-client');
      const confirmResponse = await apiPostConfirm('/api/payments/confirm', {
        paymentIntentId: data.paymentIntentId,
      });

      const confirmData = await confirmResponse.json();

      if (confirmData.success) {
        onSuccess(confirmData.orderId);
      } else {
        throw new Error(confirmData.message || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping Address */}
      <div className="bg-dark-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Shipping Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={shippingAddress.name}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Street Address
            </label>
            <input
              type="text"
              value={shippingAddress.street}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              City
            </label>
            <input
              type="text"
              value={shippingAddress.city}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              State
            </label>
            <input
              type="text"
              value={shippingAddress.state}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ZIP Code
            </label>
            <input
              type="text"
              value={shippingAddress.zip}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, zip: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Country
            </label>
            <select
              value={shippingAddress.country}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, country: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-accent-500"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-dark-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-accent-500" />
          Payment Method
        </h3>
        <div className="bg-dark-600 border border-dark-500 rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-dark-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ShoppingBag className="w-5 h-5 mr-2 text-accent-500" />
          Order Summary
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-300">
            <span>Subtotal</span>
            <span>${totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Tax</span>
            <span>${totals.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Processing Fee</span>
            <span>${totals.fees.toFixed(2)}</span>
          </div>
          <div className="border-t border-dark-500 pt-2">
            <div className="flex justify-between text-white font-semibold text-lg">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Pay ${totals.total.toFixed(2)}
          </>
        )}
      </button>
    </form>
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

  const handleSuccess = (orderId: string) => {
    setStatus('success');
    setMessage(`Order #${orderId} confirmed! You will receive an email confirmation shortly.`);
  };

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

      <Elements stripe={stripePromise}>
        <CheckoutForm
          cartItems={cartItems}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </Elements>
    </div>
  );
};

export default CheckoutPage;
