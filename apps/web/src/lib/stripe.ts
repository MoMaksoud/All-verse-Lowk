import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});


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
