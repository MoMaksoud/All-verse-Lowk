import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreServices } from '@/lib/services/firestore';
import { ProfileService } from '@/lib/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// EasyPost API configuration
const easypostApiKey = process.env.EASYPOST_API_KEY;

if (!easypostApiKey) {
  console.error('❌ EASYPOST_API_KEY is not configured');
}

const EASYPOST_API_URL = 'https://api.easypost.com/v2';

interface CreateLabelRequest {
  rateId: string;
  shipmentId: string;
  orderId: string;
}

interface EasyPostShipment {
  id: string;
  tracking_code: string;
  postage_label: {
    label_url: string;
    label_pdf_url?: string;
    label_zpl_url?: string;
  };
  carrier: string;
  service: string;
}

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    // Rate limit (30/min)
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 30);

    // Check if API key is configured
    if (!easypostApiKey) {
      return NextResponse.json(
        { error: 'Shipping service is not configured', details: 'EASYPOST_API_KEY is missing' },
        { status: 500 }
      );
    }

    // Get Firestore admin instance
    const adminDb = getAdminFirestore();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database is not configured' },
        { status: 500 }
      );
    }

    const body = await req.json() as CreateLabelRequest;
    const { rateId, shipmentId, orderId } = body;

    // Validate required fields
    if (!rateId || !shipmentId || !orderId) {
      return NextResponse.json(
        { error: 'rateId, shipmentId, and orderId are required' },
        { status: 400 }
      );
    }

    console.log('📦 Creating shipping label:', { rateId, shipmentId, orderId });

    // Get order to retrieve buyer's full address
    const order = await firestoreServices.orders.getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get seller's address from profile (use first seller for now)
    const sellerId = order.items[0]?.sellerId;
    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID not found in order' }, { status: 400 });
    }

    const sellerProfile = await ProfileService.getProfile(sellerId);
    if (!sellerProfile?.shippingAddress?.zip) {
      return NextResponse.json(
        { error: 'Seller shipping address not configured. Please ask the seller to add their shipping address in their profile.' },
        { status: 400 }
      );
    }

    // Update shipment with full addresses before purchasing (required for label generation)
    console.log('📦 Updating shipment with full addresses...');
    const updateShipmentData = {
      shipment: {
        from_address: {
          street1: sellerProfile.shippingAddress.street || '',
          city: sellerProfile.shippingAddress.city || '',
          state: sellerProfile.shippingAddress.state || '',
          zip: sellerProfile.shippingAddress.zip,
          country: sellerProfile.shippingAddress.country || 'US',
        },
        to_address: {
          street1: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          zip: order.shippingAddress.zip,
          country: order.shippingAddress.country || 'US',
        },
      },
    };

    // Update the shipment first
    const updateResponse = await fetch(`${EASYPOST_API_URL}/shipments/${shipmentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(easypostApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateShipmentData),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ EasyPost shipment update error:', errorData);
      // Continue anyway - some shipments might already have addresses
    } else {
      console.log('✅ Shipment updated with full addresses');
    }

    // Purchase the label from EasyPost
    const purchaseData = {
      rate: {
        id: rateId,
      },
    };

    console.log('📦 Purchasing label from EasyPost...');

    const response = await fetch(`${EASYPOST_API_URL}/shipments/${shipmentId}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(easypostApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchaseData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ EasyPost API error:', errorData);
      
      let errorMessage = 'Failed to create shipping label';
      if (errorData.error) {
        errorMessage = errorData.error.message || errorData.error.code || errorMessage;
      }

      return NextResponse.json(
        { error: errorMessage, details: process.env.NODE_ENV === 'development' ? errorData : undefined },
        { status: response.status === 401 ? 401 : response.status === 422 ? 422 : 500 }
      );
    }

    const shipment: EasyPostShipment = await response.json();
    console.log('📦 Label purchased successfully:', {
      trackingCode: shipment.tracking_code,
      carrier: shipment.carrier,
      service: shipment.service,
    });

    // Extract shipping information
    const trackingNumber = shipment.tracking_code;
    const labelUrl = shipment.postage_label?.label_url || shipment.postage_label?.label_pdf_url || '';
    const carrier = shipment.carrier || 'Unknown';

    if (!trackingNumber || !labelUrl) {
      console.error('❌ Missing tracking number or label URL in EasyPost response');
      return NextResponse.json(
        { error: 'Invalid response from shipping service. Missing tracking number or label URL.' },
        { status: 500 }
      );
    }

    // Store shipping information in Firestore under orders/{orderId}/shipping
    const shippingRef = adminDb.collection('orders').doc(orderId).collection('shipping').doc();
    const shippingData = {
      trackingNumber,
      labelUrl,
      carrier,
      service: shipment.service || '',
      rateId,
      shipmentId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await shippingRef.set(shippingData);
    console.log('📦 Shipping information stored in Firestore');

    // Return tracking number and label URL
    return NextResponse.json({
      success: true,
      trackingNumber,
      labelUrl,
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error creating shipping label:', error);
    
    // Provide user-friendly error messages
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
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: statusCode }
    );
  }
});

