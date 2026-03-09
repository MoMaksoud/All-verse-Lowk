import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import { FieldValue } from 'firebase-admin/firestore';
import { DistanceUnitEnum, WeightUnitEnum } from 'shippo';
import { stripe, verifyWebhookSignature, calculateSellerPayout, PLATFORM_SERVICE_FEE_PERCENT } from '@/lib/stripe';
import { shippo } from '@/lib/shippo';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { logEmail } from '@/lib/emailLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type NormalizedAddress = {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

function getMissingRequiredEnv(): string[] {
  const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SHIPPO_API_KEY', 'SENDGRID_API_KEY'] as const;
  return required.filter((key) => !process.env[key]?.trim());
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeStripeAddress(input: Stripe.Address | null | undefined, name: string): NormalizedAddress {
  return {
    name,
    street: input?.line1 ?? '',
    city: input?.city ?? '',
    state: input?.state ?? '',
    zip: input?.postal_code ?? '',
    country: input?.country ?? 'US',
  };
}

function validateAddress(address: NormalizedAddress): string[] {
  const missing: string[] = [];
  if (!address.name) missing.push('name');
  if (!address.street) missing.push('street');
  if (!address.city) missing.push('city');
  if (!address.state) missing.push('state');
  if (!address.zip) missing.push('zip');
  if (!address.country) missing.push('country');
  return missing;
}

async function sendBuyerEmail(params: {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  itemName: string;
  totalPaid: number;
  shippingAddress: NormalizedAddress;
}): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const templateId = process.env.SENDGRID_ORDER_TEMPLATE_ID;
  if (!fromEmail || !templateId) {
    return { success: false, error: 'Missing SENDGRID_FROM_EMAIL or SENDGRID_ORDER_TEMPLATE_ID' };
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: params.buyerEmail,
      from: fromEmail,
      templateId,
      dynamicTemplateData: {
        orderId: params.orderId,
        orderIdShort: params.orderId.slice(0, 8),
        buyerName: params.buyerName,
        itemName: params.itemName,
        totalPaid: params.totalPaid,
        shippingAddress: params.shippingAddress,
        // Keep existing template-compatible fields
        items: [{ title: params.itemName, qty: 1, unitPrice: params.totalPaid }],
        subtotal: params.totalPaid,
        tax: 0,
        fees: 0,
        total: params.totalPaid,
      },
    });
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function sendSellerEmail(params: {
  sellerEmail: string;
  sellerName: string;
  buyerName: string;
  itemName: string;
  orderId: string;
  totalPaid: number;
  labelUrl: string;
  trackingNumber: string;
}): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const templateId = process.env.SENDGRID_SELLER_TEMPLATE_ID;
  if (!fromEmail || !templateId) {
    return { success: false, error: 'Missing SENDGRID_FROM_EMAIL or SENDGRID_SELLER_TEMPLATE_ID' };
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: params.sellerEmail,
      from: fromEmail,
      templateId,
      dynamicTemplateData: {
        sellerName: params.sellerName,
        buyerName: params.buyerName,
        itemSold: params.itemName,
        itemTitle: params.itemName,
        quantity: 1,
        unitPrice: params.totalPaid,
        total: params.totalPaid,
        orderId: params.orderId,
        orderIdShort: params.orderId.slice(0, 8),
        labelUrl: params.labelUrl,
        trackingNumber: params.trackingNumber,
      },
    });
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function POST(req: NextRequest) {
  const missingEnv = getMissingRequiredEnv();
  if (missingEnv.length > 0) {
    return NextResponse.json(
      { error: `Missing required environment variables: ${missingEnv.join(', ')}` },
      { status: 500 }
    );
  }

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const verification = verifyWebhookSignature(payload, signature, webhookSecret);
  if (!verification.success || !verification.event) {
    return NextResponse.json({ error: verification.error ?? 'Invalid Stripe signature' }, { status: 400 });
  }

  const event = verification.event;
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const adminDb = getAdminFirestore();
  const eventRef = adminDb.collection('stripe_webhook_events').doc(event.id);
  const existingEvent = await eventRef.get();
  if (existingEvent.exists && existingEvent.get('processed') === true) {
    return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
  }

  await eventRef.set(
    {
      eventId: event.id,
      type: event.type,
      processed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'customer'],
    });

    const sellerId = asString(fullSession.metadata?.sellerId).trim();
    const itemId = asString(fullSession.metadata?.itemId).trim();
    if (!sellerId || !itemId) {
      throw new Error('Missing required metadata: sellerId and/or itemId');
    }

    const customerObj = fullSession.customer;
    const customerEmail =
      typeof customerObj === 'object' && customerObj !== null && 'email' in customerObj && customerObj.email
        ? asString(customerObj.email)
        : '';
    const buyerEmail =
      asString(fullSession.customer_details?.email) ||
      asString(fullSession.customer_email) ||
      customerEmail;
    if (!buyerEmail) {
      throw new Error('Missing buyer email in checkout session');
    }

    const sessionWithShipping = fullSession as Stripe.Checkout.Session & {
      shipping_details?: { name?: string | null; address?: Stripe.Address | null };
    };
    const buyerName = asString(sessionWithShipping.shipping_details?.name) || 'Customer';
    const shippingAddress = normalizeStripeAddress(sessionWithShipping.shipping_details?.address, buyerName);
    const missingBuyerAddress = validateAddress(shippingAddress);
    if (missingBuyerAddress.length > 0) {
      throw new Error(`Missing buyer shipping fields: ${missingBuyerAddress.join(', ')}`);
    }

    const sellerProfileSnap = await adminDb.collection('profiles').doc(sellerId).get();
    if (!sellerProfileSnap.exists) {
      throw new Error(`Seller profile not found for sellerId: ${sellerId}`);
    }
    const sellerProfile = sellerProfileSnap.data() as {
      displayName?: string;
      shippingAddress?: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
      };
      stripeConnectAccountId?: string;
    };

    const auth = getAdminAuth();
    if (!auth) {
      throw new Error('Firebase Admin Auth is unavailable');
    }
    const sellerUser = await auth.getUser(sellerId);
    const sellerEmail = sellerUser.email ?? '';
    if (!sellerEmail) {
      throw new Error('Seller email is missing');
    }

    const sellerAddress: NormalizedAddress = {
      name: sellerProfile.displayName || sellerUser.displayName || 'Seller',
      street: sellerProfile.shippingAddress?.street || '',
      city: sellerProfile.shippingAddress?.city || '',
      state: sellerProfile.shippingAddress?.state || '',
      zip: sellerProfile.shippingAddress?.zip || '',
      country: sellerProfile.shippingAddress?.country || 'US',
    };
    const missingSellerAddress = validateAddress(sellerAddress);
    if (missingSellerAddress.length > 0) {
      throw new Error(`Missing seller shipping fields: ${missingSellerAddress.join(', ')}`);
    }

    const existingOrderSnap = await adminDb
      .collection('orders')
      .where('checkoutSessionId', '==', fullSession.id)
      .limit(1)
      .get();
    if (!existingOrderSnap.empty) {
      await eventRef.set(
        { processed: true, orderId: existingOrderSnap.docs[0].id, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
    }

    const listingSnap = await adminDb.collection('listings').doc(itemId).get();
    const itemName =
      (listingSnap.exists ? asString(listingSnap.get('title')) : '') ||
      asString(fullSession.line_items?.data?.[0]?.description) ||
      'Marketplace Item';

    const amountTotal = (fullSession.amount_total ?? 0) / 100;
    const paymentIntentId =
      typeof fullSession.payment_intent === 'string' ? fullSession.payment_intent : fullSession.payment_intent?.id;
    if (!paymentIntentId) {
      throw new Error('Missing paymentIntentId from checkout session');
    }

    const shipment = await shippo.shipments.create({
      addressFrom: {
        name: sellerAddress.name,
        street1: sellerAddress.street,
        city: sellerAddress.city,
        state: sellerAddress.state,
        zip: sellerAddress.zip,
        country: sellerAddress.country,
        email: sellerEmail,
      },
      addressTo: {
        name: shippingAddress.name,
        street1: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip,
        country: shippingAddress.country,
        email: buyerEmail,
      },
      parcels: [
        {
          length: '10',
          width: '8',
          height: '4',
          distanceUnit: DistanceUnitEnum.In,
          weight: '1',
          massUnit: WeightUnitEnum.Lb,
        },
      ],
      async: false,
    });

    const rates = shipment.rates ?? [];
    if (rates.length === 0) {
      throw new Error('Shippo returned no rates for webhook label generation');
    }

    const selectedRate = [...rates].sort((a, b) => Number(a.amount) - Number(b.amount))[0];
    const rateId = (selectedRate as { objectId?: string; object_id?: string }).object_id ?? selectedRate.objectId;
    if (!rateId) {
      throw new Error('Unable to resolve Shippo rate ID');
    }

    let transaction = await shippo.transactions.create({
      rate: rateId,
      label_file_type: 'PDF',
      async: false,
    } as Parameters<typeof shippo.transactions.create>[0]);

    type TxShape = {
      status?: string;
      object_id?: string;
      objectId?: string;
      label_url?: string;
      labelUrl?: string;
      tracking_number?: string;
      trackingNumber?: string;
    };

    let completedTx = transaction as TxShape;
    if (completedTx.status !== 'SUCCESS') {
      const txId = completedTx.object_id ?? completedTx.objectId;
      if (!txId) {
        throw new Error('Shippo transaction missing ID');
      }
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        completedTx = (await shippo.transactions.get(txId)) as TxShape;
        if (completedTx.status === 'SUCCESS') break;
        if (completedTx.status === 'ERROR') {
          throw new Error('Shippo transaction failed with ERROR status');
        }
      }
    }

    const labelUrl = completedTx.label_url ?? completedTx.labelUrl ?? '';
    const trackingNumber = completedTx.tracking_number ?? completedTx.trackingNumber ?? '';
    if (!labelUrl || !trackingNumber) {
      throw new Error('Shippo did not return label URL and tracking number');
    }

    const carrier = selectedRate.provider || 'Unknown';
    const orderRef = adminDb.collection('orders').doc();
    const orderId = orderRef.id;

    const { platformFee, sellerPayout } = calculateSellerPayout(amountTotal, PLATFORM_SERVICE_FEE_PERCENT);

    await orderRef.set({
      orderId,
      checkoutSessionId: fullSession.id,
      itemId,
      sellerId,
      sellerIds: [sellerId],
      buyerEmail,
      shippingAddress,
      paymentIntentId,
      amountTotal,
      status: 'paid',
      labelUrl,
      trackingNumber,
      carrier,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      payout: {
        sellerStripeAccountId: sellerProfile.stripeConnectAccountId || '',
        platformFee,
        sellerAmount: sellerPayout,
        payoutStatus: 'pending',
      },
    });

    await adminDb.collection('payouts').doc(orderId).set({
      orderId,
      sellerId,
      sellerStripeAccountId: sellerProfile.stripeConnectAccountId || '',
      platformFee,
      sellerAmount: sellerPayout,
      payoutStatus: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const buyerEmailResult = await sendBuyerEmail({
      buyerEmail,
      buyerName,
      orderId,
      itemName,
      totalPaid: amountTotal,
      shippingAddress,
    });
    await logEmail('order_confirmation', buyerEmail, buyerEmailResult.success ? 'success' : 'failed', {
      orderId,
      error: buyerEmailResult.error,
    });

    const sellerEmailResult = await sendSellerEmail({
      sellerEmail,
      sellerName: sellerAddress.name,
      buyerName,
      itemName,
      orderId,
      totalPaid: amountTotal,
      labelUrl,
      trackingNumber,
    });
    await logEmail('seller_notification', sellerEmail, sellerEmailResult.success ? 'success' : 'failed', {
      orderId,
      error: sellerEmailResult.error,
    });

    await eventRef.set(
      {
        processed: true,
        orderId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ received: true, orderId }, { status: 200 });
  } catch (error: unknown) {
    await eventRef.set(
      {
        processed: false,
        lastError: error instanceof Error ? error.message : String(error),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.error('[stripe/webhook] failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

