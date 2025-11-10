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
      paymentIntent, // Return full object for metadata updates
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

// ============================================================================
// STRIPE CONNECT - SELLER PAYOUTS
// ============================================================================

// Platform service fee percentage (4.5%)
export const PLATFORM_SERVICE_FEE_PERCENT = 4.5;

/**
 * Create a Stripe Connect account for a seller
 */
export async function createConnectAccount(email: string, userId: string) {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      metadata: {
        userId,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return {
      success: true,
      accountId: account.id,
      account,
    };
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Connect account',
    };
  }
}

/**
 * Create account link for onboarding
 */
export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: 'account_onboarding',
    });

    return {
      success: true,
      url: accountLink.url,
    };
  } catch (error) {
    console.error('Error creating account link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account link',
    };
  }
}

/**
 * Get Connect account status
 */
export async function getConnectAccount(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      success: true,
      account,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  } catch (error) {
    console.error('Error retrieving Connect account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve Connect account',
    };
  }
}

/**
 * Transfer funds to seller's Connect account
 * This is called after payment succeeds
 */
export async function transferToSeller(accountId: string, amount: number, orderId: string) {
  try {
    // Amount in cents
    const amountInCents = Math.round(amount * 100);
    
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: accountId,
      metadata: {
        orderId,
        type: 'seller_payout',
      },
    });

    return {
      success: true,
      transferId: transfer.id,
      transfer,
    };
  } catch (error) {
    console.error('Error transferring to seller:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transfer to seller',
    };
  }
}

/**
 * Calculate seller payout amount (after platform fees)
 */
export function calculateSellerPayout(itemTotal: number, platformFeePercent: number = PLATFORM_SERVICE_FEE_PERCENT): {
  itemTotal: number;
  platformFee: number;
  sellerPayout: number;
} {
  const platformFee = itemTotal * (platformFeePercent / 100);
  const sellerPayout = itemTotal - platformFee;

  return {
    itemTotal,
    platformFee,
    sellerPayout,
  };
}