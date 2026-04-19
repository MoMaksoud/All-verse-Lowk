import { NextRequest } from 'next/server';
import { withApi } from '@/lib/withApi';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getOrderAdmin } from '@/lib/server/adminOrders';
import { canCreateShippingLabel } from '@/lib/authz';
import { fail, ok } from '@/lib/api/responses';
import {
  acquireShippingLabelLock,
  createAndResolveShippoLabel,
  markShippingLabelFailed,
  markShippingLabelSuccess,
} from '@/lib/payments/shippingLabel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateLabelRequest {
  rateId: string;
  shipmentId: string;
  orderId: string;
}

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  let requestedOrderId: string | null = null;
  try {
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 30);

    try {
      if (!process.env.SHIPPO_API_KEY?.trim()) {
        return fail({
          status: 500,
          code: 'SHIPPO_NOT_CONFIGURED',
          message: 'Shipping service is not configured',
          details: 'SHIPPO_API_KEY is missing',
        });
      }
    } catch {
      return fail({
        status: 500,
        code: 'SHIPPO_NOT_CONFIGURED',
        message: 'Shipping service is not configured',
        details: 'SHIPPO_API_KEY is missing',
      });
    }

    const adminDb = getAdminFirestore();
    if (!adminDb) {
      return fail({ status: 500, code: 'DB_NOT_CONFIGURED', message: 'Database is not configured' });
    }

    const body = (await req.json()) as CreateLabelRequest;
    const { rateId, shipmentId, orderId } = body;
    requestedOrderId = orderId || null;

    if (!rateId || !shipmentId || !orderId) {
      return fail({
        status: 400,
        code: 'INVALID_REQUEST',
        message: 'rateId, shipmentId, and orderId are required',
      });
    }

    console.log('📦 Creating shipping label (Shippo):', { rateId, shipmentId, orderId });

    const order = await getOrderAdmin(orderId);
    if (!order) {
      return fail({ status: 404, code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    if (!canCreateShippingLabel(order as any, req.userId)) {
      return fail({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Only the seller for a paid order can create shipping labels',
      });
    }

    if (!order.shipping?.rateId || !order.shipping?.shipmentId) {
      return fail({
        status: 409,
        code: 'ORDER_SHIPPING_MISSING',
        message: 'Order does not contain shipping rate information required for label generation',
      });
    }
    if (order.shipping.rateId !== rateId || order.shipping.shipmentId !== shipmentId) {
      return fail({
        status: 409,
        code: 'SHIPPING_SELECTION_MISMATCH',
        message: 'Selected shipping label request does not match the order shipping selection',
      });
    }

    const lockResult = await acquireShippingLabelLock({
      adminDb,
      orderId,
      rateId,
      shipmentId,
    });

    if (lockResult.action === 'already_exists') {
      return ok(
        {
          trackingNumber: lockResult.existing.trackingNumber,
          labelUrl: lockResult.existing.labelUrl,
          idempotent: true,
        },
        200
      );
    }

    if (lockResult.action === 'processing') {
      return fail({
        status: 409,
        code: 'LABEL_PROCESSING',
        message: 'Shipping label generation is already in progress for this order',
      });
    }

    const shippoResult = await createAndResolveShippoLabel(rateId);
    await markShippingLabelSuccess({
      adminDb,
      orderId,
      trackingNumber: shippoResult.trackingNumber,
      labelUrl: shippoResult.labelUrl,
      carrier: shippoResult.carrier,
      service: shippoResult.service,
      rateId,
      shipmentId,
    });
    console.log('📦 Shipping information stored in Firestore');

    return ok(
      {
        trackingNumber: shippoResult.trackingNumber,
        labelUrl: shippoResult.labelUrl,
      },
      200
    );
  } catch (error: unknown) {
    console.error('❌ Error creating shipping label:', error);

    let errorMessage = 'Failed to create shipping label';
    let statusCode = 500;

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
        errorMessage = 'Unable to connect to shipping service. Please check your internet connection and try again.';
        statusCode = 503;
      } else if (msg.includes('timeout')) {
        errorMessage = 'Request to shipping service timed out. Please try again.';
        statusCode = 504;
      } else if (msg.includes('permission') || msg.includes('firestore')) {
        errorMessage = 'Database error. Please try again.';
        statusCode = 500;
      } else if (msg.includes('shippo') || msg.includes('api key')) {
        errorMessage = 'Shipping service error. Please try again or choose another rate.';
        statusCode = 502;
      }
    }

    if (requestedOrderId && getAdminFirestore()) {
      try {
        await markShippingLabelFailed({
          adminDb: getAdminFirestore()!,
          orderId: requestedOrderId,
          error,
        });
      } catch (lockError) {
        console.error('❌ Failed to release shipping label lock after error:', lockError);
      }
    }

    return fail({
      status: statusCode,
      code: 'SHIPPING_LABEL_FAILED',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    });
  }
});
