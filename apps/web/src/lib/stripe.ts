import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
};

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: 'usd',
  payment_method_types: ['card'] as const,
  mode: 'payment' as const,
};

// Payment intent creation
export async function createPaymentIntent(amount: number, currency: string = 'usd', metadata?: Record<string, string>) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

// Create checkout session
export async function createCheckoutSession(
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: [...STRIPE_CONFIG.payment_method_types],
      line_items: lineItems,
      mode: STRIPE_CONFIG.mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

// Retrieve payment intent
export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      paymentIntent,
    };
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve payment intent',
    };
  }
}

// Update payment intent
export async function updatePaymentIntent(
  paymentIntentId: string,
  updates: Stripe.PaymentIntentUpdateParams
) {
  try {
    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, updates);
    return {
      success: true,
      paymentIntent,
    };
  } catch (error) {
    console.error('Error updating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update payment intent',
    };
  }
}

// Cancel payment intent
export async function cancelPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return {
      success: true,
      paymentIntent,
    };
  } catch (error) {
    console.error('Error canceling payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel payment intent',
    };
  }
}

// Create refund
export async function createRefund(paymentIntentId: string, amount?: number, reason?: string) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
      reason: reason as any,
    });

    return {
      success: true,
      refund,
    };
  } catch (error) {
    console.error('Error creating refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create refund',
    };
  }
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string, secret: string) {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return {
      success: true,
      event,
    };
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify webhook signature',
    };
  }
}

// Calculate fees (example: 2.9% + $0.30)
export function calculateStripeFees(amount: number): number {
  const percentageFee = amount * 0.029; // 2.9%
  const fixedFee = 0.30; // $0.30
  return percentageFee + fixedFee;
}

// Calculate total with fees
export function calculateTotalWithFees(subtotal: number, tax: number = 0): {
  subtotal: number;
  tax: number;
  fees: number;
  total: number;
} {
  const fees = calculateStripeFees(subtotal + tax);
  const total = subtotal + tax + fees;

  return {
    subtotal,
    tax,
    fees,
    total,
  };
}
