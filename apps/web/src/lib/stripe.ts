import Stripe from 'stripe';
import { calculateStripeFees as calculateStripeFeesBase } from '@/lib/payments/pricing';
import { assertStripeConfig } from '@/lib/config';
import { getStripeMode, isCommerceSandbox } from '@/lib/payments/environment';

// Server-side Stripe instance
let stripeClient: Stripe | undefined;
export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    getStripeMode();
    stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), { apiVersion: '2025-08-27.basil' });
    const value = Reflect.get(stripeClient, property);
    return typeof value === 'function' ? value.bind(stripeClient) : value;
  },
});

async function assertSandboxWebhookTargets() {
  if (!isCommerceSandbox()) return;
  // Forwarding with Stripe CLI does not disable an account's existing public webhooks.
  for await (const endpoint of stripe.webhookEndpoints.list({ limit: 100 })) {
    if (endpoint.status !== 'enabled') continue;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(endpoint.url).hostname);
    if (!local) throw new Error('Use an isolated Stripe sandbox: this account still forwards events to a public webhook.');
  }
}

/**
 * Create a Stripe Checkout Session (mode: payment).
 * Does NOT create a Firestore order — the order is created atomically in the
 * payment webhook after the buyer pays. Pass buyerId so the webhook can look
 * up the checkout snapshot by session.id.
 */
export async function createCheckoutSession(params: {
  amountTotalCents: number;
  buyerId: string;
  successUrl: string;
  cancelUrl: string;
  description?: string;
}) {
  try {
    assertStripeConfig();
    await assertSandboxWebhookTargets();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: params.buyerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: params.amountTotalCents,
            product_data: {
              name: 'Order',
              description: params.description || 'Marketplace order',
            },
          },
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      expires_at: expiresAt,
      metadata: {
        buyerId: params.buyerId,
      },
      payment_intent_data: {
        metadata: {
          buyerId: params.buyerId,
        },
      },
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
      session,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
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
  return calculateStripeFeesBase(amount);
}

// Calculate total with fees
export function calculateTotalWithFees(subtotal: number, tax: number = 0): {
  subtotal: number;
  tax: number;
  fees: number;
  total: number;
} {
  const fees = calculateStripeFeesBase(subtotal + tax);
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
    assertStripeConfig();
    await assertSandboxWebhookTargets();
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
    assertStripeConfig();
    await assertSandboxWebhookTargets();
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
export async function transferToSeller(
  accountId: string,
  amount: number,
  orderId: string,
  idempotencyKey: string,
  sourceChargeId: string
) {
  try {
    assertStripeConfig();
    if (!sourceChargeId?.startsWith('ch_')) throw new Error('Seller transfer requires the original source charge.');
    await assertSandboxWebhookTargets();
    // Amount in cents
    const amountInCents = Math.round(amount * 100);
    
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: accountId,
      source_transaction: sourceChargeId,
      transfer_group: `order_${orderId}`,
      metadata: {
        orderId,
        type: 'seller_payout',
      },
    }, idempotencyKey ? { idempotencyKey } : undefined);

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
