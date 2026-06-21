import { FieldValue } from 'firebase-admin/firestore';
import { shippo } from '@/lib/shippo';

export type ShippingLabelDoc = {
  status?: 'processing' | 'success' | 'failed';
  processingStartedAt?: number;
  trackingNumber?: string;
  labelUrl?: string;
  carrier?: string;
  service?: string;
  rateId?: string;
  shipmentId?: string;
};

export const SHIPPING_LABEL_LOCK_TTL_MS = 5 * 60 * 1000;

type ShippingLabelLockResult =
  | { action: 'acquired' }
  | { action: 'processing' }
  | { action: 'already_exists'; existing: { trackingNumber: string; labelUrl: string } };

export async function acquireShippingLabelLock(params: {
  adminDb: FirebaseFirestore.Firestore;
  orderId: string;
  rateId: string;
  shipmentId: string;
}): Promise<ShippingLabelLockResult> {
  const shippingDocRef = params.adminDb.collection('orders').doc(params.orderId).collection('shipping').doc('primary');

  return params.adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(shippingDocRef);
    const existing = (snap.data() || {}) as ShippingLabelDoc;
    const now = Date.now();

    if (existing.status === 'success' && existing.trackingNumber && existing.labelUrl) {
      return {
        action: 'already_exists',
        existing: {
          trackingNumber: existing.trackingNumber,
          labelUrl: existing.labelUrl,
        },
      };
    }

    if (
      existing.status === 'processing' &&
      existing.processingStartedAt &&
      now - existing.processingStartedAt < SHIPPING_LABEL_LOCK_TTL_MS
    ) {
      return { action: 'processing' };
    }

    tx.set(
      shippingDocRef,
      {
        status: 'processing',
        processingStartedAt: now,
        rateId: params.rateId,
        shipmentId: params.shipmentId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { action: 'acquired' };
  });
}

export async function markShippingLabelSuccess(params: {
  adminDb: FirebaseFirestore.Firestore;
  orderId: string;
  trackingNumber: string;
  labelUrl: string;
  carrier: string;
  service: string;
  rateId: string;
  shipmentId: string;
}) {
  const shippingDocRef = params.adminDb.collection('orders').doc(params.orderId).collection('shipping').doc('primary');
  await shippingDocRef.set(
    {
      status: 'success',
      processingStartedAt: FieldValue.delete(),
      trackingNumber: params.trackingNumber,
      labelUrl: params.labelUrl,
      carrier: params.carrier,
      service: params.service,
      rateId: params.rateId,
      shipmentId: params.shipmentId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function markShippingLabelFailed(params: {
  adminDb: FirebaseFirestore.Firestore;
  orderId: string;
  error: unknown;
}) {
  await params.adminDb
    .collection('orders')
    .doc(params.orderId)
    .collection('shipping')
    .doc('primary')
    .set(
      {
        status: 'failed',
        processingStartedAt: FieldValue.delete(),
        lastError: params.error instanceof Error ? params.error.message : String(params.error),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

type ShippoTxShape = {
  status?: string;
  object_id?: string;
  objectId?: string;
  label_url?: string;
  labelUrl?: string;
  tracking_number?: string;
  trackingNumber?: string;
  carrier?: string;
  servicelevel?: { name?: string; token?: string };
};

/** Heuristic: Shippo often returns generic messages; expand as you observe real API errors. */
export function isLikelyExpiredShippoRateError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /expired|stale|invalid.*rate|rate.*invalid|no longer valid|not available|obsolete/i.test(msg);
}

export async function createAndResolveShippoLabel(rateId: string): Promise<{
  trackingNumber: string;
  labelUrl: string;
  carrier: string;
  service: string;
}> {
  const transaction = await shippo.transactions.create({
    rate: rateId,
    label_file_type: 'PDF',
    async: false,
  } as Parameters<typeof shippo.transactions.create>[0]);

  let completedTx = transaction as ShippoTxShape;

  if (completedTx.status !== 'SUCCESS') {
    const transactionId = completedTx.object_id ?? completedTx.objectId;
    if (!transactionId) {
      throw new Error('Invalid response from shipping service. Missing transaction ID.');
    }
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      completedTx = (await shippo.transactions.get(transactionId)) as ShippoTxShape;
      if (completedTx.status === 'SUCCESS') break;
      if (completedTx.status === 'ERROR') {
        throw new Error('Label creation failed. Please try another rate or contact support.');
      }
    }
  }

  if (completedTx.status !== 'SUCCESS') {
    throw new Error('Label creation is taking longer than expected. Please try again or contact support.');
  }

  const trackingNumber = completedTx.tracking_number ?? completedTx.trackingNumber ?? '';
  const labelUrl = completedTx.label_url ?? completedTx.labelUrl ?? '';
  const carrier = completedTx.carrier ?? 'Unknown';
  const service = completedTx.servicelevel?.name ?? completedTx.servicelevel?.token ?? '';

  if (!trackingNumber || !labelUrl) {
    throw new Error('Invalid response from shipping service. Missing tracking number or label URL.');
  }

  return { trackingNumber, labelUrl, carrier, service };
}
