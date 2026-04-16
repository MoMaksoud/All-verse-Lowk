import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreServices } from '@/lib/services/firestore';
import { shippo } from '@/lib/shippo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateLabelRequest {
  rateId: string;
  shipmentId: string;
  orderId: string;
}

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 30);

    try {
      if (!process.env.SHIPPO_API_KEY?.trim()) {
        return NextResponse.json(
          { error: 'Shipping service is not configured', details: 'SHIPPO_API_KEY is missing' },
          { status: 500 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Shipping service is not configured', details: 'SHIPPO_API_KEY is missing' },
        { status: 500 }
      );
    }

    const adminDb = getAdminFirestore();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database is not configured' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as CreateLabelRequest;
    const { rateId, shipmentId, orderId } = body;

    if (!rateId || !shipmentId || !orderId) {
      return NextResponse.json(
        { error: 'rateId, shipmentId, and orderId are required' },
        { status: 400 }
      );
    }

    console.log('📦 Creating shipping label (Shippo):', { rateId, shipmentId, orderId });

    const order = await firestoreServices.orders.getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // The selected rate is already tied to a pre-created shipment from checkout flow.
    // At label purchase time, Shippo only requires a valid rateId/shipment context.

    const transaction = await shippo.transactions.create({
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
      tracking_url_provider?: string;
      trackingUrlProvider?: string;
      rate?: string;
      carrier?: string;
      servicelevel?: { name?: string; token?: string };
    };

    let completedTx = transaction as TxShape;

    if (completedTx.status !== 'SUCCESS') {
      const transactionId = completedTx.object_id ?? completedTx.objectId;
      if (!transactionId) {
        return NextResponse.json(
          { error: 'Invalid response from shipping service. Missing transaction ID.' },
          { status: 500 }
        );
      }
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        completedTx = (await shippo.transactions.get(transactionId)) as TxShape;
        if (completedTx.status === 'SUCCESS') break;
        if (completedTx.status === 'ERROR') {
          return NextResponse.json(
            { error: 'Label creation failed. Please try another rate or contact support.' },
            { status: 422 }
          );
        }
      }
    }

    if (completedTx.status !== 'SUCCESS') {
      return NextResponse.json(
        { error: 'Label creation is taking longer than expected. Please try again or contact support.' },
        { status: 504 }
      );
    }

    const trackingNumber = completedTx.tracking_number ?? completedTx.trackingNumber ?? '';
    const labelUrl = completedTx.label_url ?? completedTx.labelUrl ?? '';
    const carrier = (completedTx as { carrier?: string }).carrier ?? 'Unknown';
    const service = completedTx.servicelevel?.name ?? completedTx.servicelevel?.token ?? '';

    if (!trackingNumber || !labelUrl) {
      console.error('❌ Missing tracking number or label URL in Shippo response');
      return NextResponse.json(
        { error: 'Invalid response from shipping service. Missing tracking number or label URL.' },
        { status: 500 }
      );
    }

    const shippingRef = adminDb.collection('orders').doc(orderId).collection('shipping').doc();
    await shippingRef.set({
      trackingNumber,
      labelUrl,
      carrier,
      service,
      rateId,
      shipmentId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('📦 Shipping information stored in Firestore');

    return NextResponse.json({
      success: true,
      trackingNumber,
      labelUrl,
    }, { status: 200 });
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

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
      },
      { status: statusCode }
    );
  }
});
