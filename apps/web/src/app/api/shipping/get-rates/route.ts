import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// EasyPost API configuration
const easypostApiKey = process.env.EASYPOST_API_KEY;

if (!easypostApiKey) {
  console.error('❌ EASYPOST_API_KEY is not configured');
}

const EASYPOST_API_URL = 'https://api.easypost.com/v2';

interface ShippingRatesRequest {
  weight: number;
  length: number;
  width: number;
  height: number;
  fromZip: string;
  toZip: string;
  // Optional full addresses for more accurate rates and label generation
  fromAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip: string;
    country?: string;
  };
  toAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip: string;
    country?: string;
  };
}

interface EasyPostRate {
  id: string;
  object: string;
  service: string;
  carrier: string;
  carrier_account_id: string;
  shipment_id: string;
  rate: string;
  currency: string;
  retail_rate: string;
  retail_currency: string;
  list_rate: string;
  list_currency: string;
  delivery_days?: number;
  delivery_date?: string;
  delivery_date_guaranteed?: boolean;
  est_delivery_days?: number;
}

interface ShippingRate {
  id?: string;
  serviceName: string;
  carrier: string;
  price: number;
  currency: string;
  deliveryDays?: number;
  deliveryDate?: string;
  deliveryDateGuaranteed?: boolean;
}

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    // Rate limit (60/min)
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 60);

    // Check if API key is configured
    if (!easypostApiKey) {
      return NextResponse.json(
        { error: 'Shipping service is not configured', details: 'EASYPOST_API_KEY is missing' },
        { status: 500 }
      );
    }

    const body = await req.json() as ShippingRatesRequest;
    const { weight, length, width, height, fromZip, toZip } = body;

    // Validate required fields
    if (!weight || weight <= 0) {
      return NextResponse.json(
        { error: 'Weight is required and must be greater than 0' },
        { status: 400 }
      );
    }

    if (!length || length <= 0 || !width || width <= 0 || !height || height <= 0) {
      return NextResponse.json(
        { error: 'Length, width, and height are required and must be greater than 0' },
        { status: 400 }
      );
    }

    if (!fromZip || !toZip) {
      return NextResponse.json(
        { error: 'From ZIP and To ZIP are required' },
        { status: 400 }
      );
    }

    // Validate ZIP code format (basic US ZIP validation)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(fromZip) || !zipRegex.test(toZip)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code format. Please use 5-digit or 9-digit ZIP codes' },
        { status: 400 }
      );
    }

    console.log('📦 Getting shipping rates:', { weight, length, width, height, fromZip, toZip });

    // Use full addresses if provided, otherwise ZIP-only (ZIP-only works for rate calculation)
    const fromAddress = body.fromAddress || {
      zip: fromZip,
      country: 'US',
    };

    const toAddress = body.toAddress || {
      zip: toZip,
      country: 'US',
    };

    // Create parcel
    // EasyPost expects weight in ounces, so convert from pounds
    const weightInOunces = weight * 16;
    const parcel = {
      length: length.toFixed(2),
      width: width.toFixed(2),
      height: height.toFixed(2),
      weight: weightInOunces.toFixed(2),
    };

    // Create shipment to get rates
    const shipmentData = {
      shipment: {
        to_address: toAddress,
        from_address: fromAddress,
        parcel: parcel,
      },
    };

    console.log('📦 Creating EasyPost shipment...');

    const response = await fetch(`${EASYPOST_API_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(easypostApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ EasyPost API error:', errorData);
      
      let errorMessage = 'Failed to get shipping rates';
      if (errorData.error) {
        errorMessage = errorData.error.message || errorData.error.code || errorMessage;
      }

      return NextResponse.json(
        { error: errorMessage, details: process.env.NODE_ENV === 'development' ? errorData : undefined },
        { status: response.status === 401 ? 401 : response.status === 422 ? 422 : 500 }
      );
    }

    const shipment = await response.json();
    console.log('📦 Shipment created, rates available:', shipment.rates?.length || 0);

    // Transform EasyPost rates to our format
    const rates: ShippingRate[] = (shipment.rates || []).map((rate: EasyPostRate) => ({
      id: rate.id, // Include EasyPost rate ID for purchasing
      serviceName: rate.service || 'Standard',
      carrier: rate.carrier || 'Unknown',
      price: parseFloat(rate.rate),
      currency: rate.currency || 'USD',
      deliveryDays: rate.delivery_days || rate.est_delivery_days || undefined,
      deliveryDate: rate.delivery_date || undefined,
      deliveryDateGuaranteed: rate.delivery_date_guaranteed || false,
    }));

    // Sort rates by price (lowest first)
    rates.sort((a, b) => a.price - b.price);

    console.log('📦 Returning', rates.length, 'shipping rates');

    return NextResponse.json({
      success: true,
      rates,
      shipmentId: shipment.id,
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error getting shipping rates:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to get shipping rates';
    let statusCode = 500;

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
        errorMessage = 'Unable to connect to shipping service. Please check your internet connection and try again.';
        statusCode = 503;
      } else if (msg.includes('timeout')) {
        errorMessage = 'Request to shipping service timed out. Please try again.';
        statusCode = 504;
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

