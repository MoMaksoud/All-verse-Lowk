import { DistanceUnitEnum, WeightUnitEnum } from 'shippo';
import { firestoreServices } from '@/lib/services/firestore';
import { shippo } from '@/lib/shippo';
import { ProfileService } from '@/lib/firestore';
import { calculateCheckoutTotals, DEFAULT_TAX_RATE } from '@/lib/payments/pricing';

type CartItemInput = {
  listingId: string;
  qty: number;
  sellerId?: string;
  priceAtAdd?: number;
};

type ShippingAddressInput = {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

type SelectedShippingInput = {
  carrier?: string;
  serviceName?: string;
};

type TrustedShippingRate = {
  carrier: string;
  serviceName: string;
  price: number;
  rateId: string;
  shipmentId: string;
};

type ListingShippingShape = {
  weight?: string | number;
  length?: string | number;
  width?: string | number;
  height?: string | number;
};

function asPositiveNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeZip(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  return digits.slice(0, 5);
}

function sanitizeShippingAddress(address: ShippingAddressInput) {
  return {
    name: address.name?.trim() || '',
    street: address.street?.trim() || '',
    city: address.city?.trim() || '',
    state: address.state?.trim() || '',
    zip: normalizeZip(address.zip || ''),
    country: (address.country?.trim() || 'US').toUpperCase(),
  };
}

function validateShippingAddress(address: ReturnType<typeof sanitizeShippingAddress>) {
  const missing: string[] = [];

  if (!address.name) missing.push('name');
  if (!address.street) missing.push('street');
  if (!address.city) missing.push('city');
  if (!address.state) missing.push('state');
  if (!address.zip) missing.push('zip');
  if (!address.country) missing.push('country');

  if (missing.length > 0) {
    throw new Error(`Shipping address is missing required fields: ${missing.join(', ')}`);
  }
}

function getPackageDimensions(
  listings: Array<{ shipping?: ListingShippingShape | null }>
): { weight: number; length: number; width: number; height: number } {
  const firstListingWithShipping = listings.find((listing) => listing.shipping);
  const shipping = firstListingWithShipping?.shipping;

  return {
    weight: asPositiveNumber(shipping?.weight) ?? 2,
    length: asPositiveNumber(shipping?.length) ?? 12,
    width: asPositiveNumber(shipping?.width) ?? 8,
    height: asPositiveNumber(shipping?.height) ?? 6,
  };
}

function normalizeRateKey(carrier?: string, serviceName?: string) {
  return `${(carrier || '').trim().toLowerCase()}::${(serviceName || '').trim().toLowerCase()}`;
}

async function quoteTrustedShipping(params: {
  sellerId: string;
  buyerAddress: ReturnType<typeof sanitizeShippingAddress>;
  selectedShipping?: SelectedShippingInput | null;
  listings: Array<{ shipping?: ListingShippingShape | null }>;
}): Promise<TrustedShippingRate> {
  const packageDimensions = getPackageDimensions(params.listings);
  let fromZip = '10001';

  try {
    const sellerProfile = await ProfileService.getProfile(params.sellerId);
    const sellerZip = sellerProfile?.shippingAddress?.zip;
    if (sellerZip) {
      fromZip = normalizeZip(sellerZip);
    }
  } catch (error) {
    console.warn('[payments] Failed to load seller shipping ZIP. Falling back to default ZIP.', error);
  }

  const shipment = await shippo.shipments.create({
    addressFrom: {
      name: 'Seller',
      zip: fromZip,
      country: 'US',
    },
    addressTo: {
      name: params.buyerAddress.name,
      street1: params.buyerAddress.street,
      city: params.buyerAddress.city,
      state: params.buyerAddress.state,
      zip: params.buyerAddress.zip,
      country: params.buyerAddress.country,
    },
    parcels: [
      {
        length: packageDimensions.length.toFixed(2),
        width: packageDimensions.width.toFixed(2),
        height: packageDimensions.height.toFixed(2),
        distanceUnit: DistanceUnitEnum.In,
        weight: packageDimensions.weight.toFixed(2),
        massUnit: WeightUnitEnum.Lb,
      },
    ],
    async: false,
  });

  const shipmentId =
    (shipment as { object_id?: string; objectId?: string }).object_id ??
    (shipment as { object_id?: string; objectId?: string }).objectId ??
    '';

  const rates = (shipment.rates ?? []).map((rate) => ({
    carrier: rate.provider ?? 'Unknown',
    serviceName: rate.servicelevel?.name ?? rate.servicelevel?.token ?? 'Standard',
    price: Number.parseFloat(rate.amount ?? '0'),
    rateId: (rate as { object_id?: string; objectId?: string }).object_id ?? (rate as { object_id?: string; objectId?: string }).objectId ?? '',
  }));

  if (rates.length === 0) {
    throw new Error('No shipping rates available for this cart');
  }

  const sortedRates = [...rates].sort((a, b) => a.price - b.price);
  const requestedRateKey = normalizeRateKey(
    params.selectedShipping?.carrier,
    params.selectedShipping?.serviceName
  );

  const selectedRate =
    requestedRateKey !== '::'
      ? sortedRates.find((rate) => normalizeRateKey(rate.carrier, rate.serviceName) === requestedRateKey)
      : sortedRates[0];

  if (!selectedRate || !selectedRate.rateId || !shipmentId) {
    throw new Error('Selected shipping option is no longer available');
  }

  return {
    ...selectedRate,
    shipmentId,
  };
}

export async function prepareTrustedCheckout(params: {
  cartItems: CartItemInput[];
  shippingAddress: ShippingAddressInput;
  selectedShipping?: SelectedShippingInput | null;
  taxRate?: number;
}) {
  if (!Array.isArray(params.cartItems) || params.cartItems.length === 0) {
    throw new Error('Cart items are required');
  }

  const trustedShippingAddress = sanitizeShippingAddress(params.shippingAddress);
  validateShippingAddress(trustedShippingAddress);

  let subtotal = 0;
  const orderItems: Array<{
    listingId: string;
    title: string;
    qty: number;
    unitPrice: number;
    sellerId: string;
  }> = [];
  const loadedListings: Array<{ shipping?: ListingShippingShape | null }> = [];

  for (const cartItem of params.cartItems) {
    if (!cartItem?.listingId?.trim()) {
      throw new Error('Each cart item must include a listingId');
    }

    if (!Number.isInteger(cartItem.qty) || cartItem.qty <= 0) {
      throw new Error('Each cart item must include a valid quantity');
    }

    const listing = await firestoreServices.listings.getListing(cartItem.listingId.trim());
    if (!listing) {
      throw new Error(`Listing ${cartItem.listingId} not found`);
    }

    if (!listing.isActive || listing.inventory < cartItem.qty) {
      throw new Error(`Listing ${listing.title} is not available or has insufficient inventory`);
    }

    if (cartItem.sellerId && cartItem.sellerId !== listing.sellerId) {
      throw new Error(`Seller mismatch for listing ${listing.title}`);
    }

    const itemTotal = listing.price * cartItem.qty;
    subtotal += itemTotal;
    loadedListings.push({ shipping: (listing as { shipping?: ListingShippingShape | null }).shipping });
    orderItems.push({
      listingId: cartItem.listingId.trim(),
      title: listing.title,
      qty: cartItem.qty,
      unitPrice: listing.price,
      sellerId: listing.sellerId,
    });
  }

  const primarySellerId = orderItems[0]?.sellerId;
  if (!primarySellerId) {
    throw new Error('Unable to determine seller for checkout');
  }

  const trustedShipping = await quoteTrustedShipping({
    sellerId: primarySellerId,
    buyerAddress: trustedShippingAddress,
    selectedShipping: params.selectedShipping,
    listings: loadedListings,
  });

  const totals = calculateCheckoutTotals(
    subtotal,
    trustedShipping.price,
    typeof params.taxRate === 'number' ? params.taxRate : DEFAULT_TAX_RATE
  );

  return {
    ...totals,
    orderItems,
    shippingAddress: trustedShippingAddress,
    shippingRate: trustedShipping,
  };
}

export function getCheckoutBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}
