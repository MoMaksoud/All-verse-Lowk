import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { checkRateLimit, getIp } from '@/lib/rateLimit';
import { shippo } from '@/lib/shippo';
import { DistanceUnitEnum, WeightUnitEnum } from 'shippo';
import { normalizeShippoRates } from '@/lib/payments/shippingRates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ShippingRatesRequest {
  weight: number;
  length: number;
  width: number;
  height: number;
  fromZip: string;
  toZip: string;
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

interface ShippingRate {
  id?: string;
  serviceName: string;
  carrier: string;
  price: number;
  currency: string;
  deliveryDays?: number;
  deliveryDate?: string;
  deliveryDateGuaranteed?: boolean;
  // Optional fields used internally for mapping Shippo services to simplified tiers
  serviceToken?: string;
  tierKey?: 'ECONOMY' | 'STANDARD' | 'EXPRESS' | 'OVERNIGHT';
}

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 60);

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

    const body = (await req.json()) as ShippingRatesRequest;
    const { weight, length, width, height, fromZip, toZip } = body;

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

    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(fromZip) || !zipRegex.test(toZip)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code format. Please use 5-digit or 9-digit ZIP codes' },
        { status: 400 }
      );
    }

    console.log('📦 Getting shipping rates (Shippo):', { weight, length, width, height, fromZip, toZip });

    const fromAddress = body.fromAddress ?? { zip: fromZip, country: 'US' };
    const toAddress = body.toAddress ?? { zip: toZip, country: 'US' };

    const shipment = await shippo.shipments.create({
      addressFrom: {
        name: 'Seller',
        street1: fromAddress.street ?? '',
        city: fromAddress.city ?? '',
        state: fromAddress.state ?? '',
        zip: fromAddress.zip,
        country: fromAddress.country ?? 'US',
      },
      addressTo: {
        name: 'Recipient',
        street1: toAddress.street ?? '',
        city: toAddress.city ?? '',
        state: toAddress.state ?? '',
        zip: toAddress.zip,
        country: toAddress.country ?? 'US',
      },
      parcels: [
        {
          length: length.toFixed(2),
          width: width.toFixed(2),
          height: height.toFixed(2),
          distanceUnit: DistanceUnitEnum.In,
          weight: weight.toFixed(2),
          massUnit: WeightUnitEnum.Lb,
        },
      ],
      async: false,
    });

    const shippoRates = shipment.rates ?? [];
    if (shippoRates.length === 0) {
      return NextResponse.json(
        { error: 'No shipping rates available for this address and package.' },
        { status: 422 }
      );
    }

    const rates = normalizeShippoRates(shippoRates) as ShippingRate[];

    const shipmentId = (shipment as { objectId?: string; object_id?: string }).object_id ?? (shipment as { objectId?: string }).objectId ?? '';

    console.log('📦 Returning', rates.length, 'shipping rates');

    return NextResponse.json({
      success: true,
      rates,
      shipmentId,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('❌ Error getting shipping rates:', error);

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
      } else if (msg.includes('shippo_api_key') || msg.includes('api key')) {
        errorMessage = 'Shipping service is not configured. Please set SHIPPO_API_KEY.';
        statusCode = 500;
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
