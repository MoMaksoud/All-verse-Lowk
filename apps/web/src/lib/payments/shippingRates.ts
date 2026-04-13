type TierKey = 'ECONOMY' | 'STANDARD' | 'EXPRESS' | 'OVERNIGHT';

export type NormalizedShippoRate = {
  id: string;
  serviceName: string;
  carrier: string;
  price: number;
  currency: string;
  deliveryDays?: number;
  serviceToken?: string;
  tierKey?: TierKey;
};

const ALLOWED_TOKENS_BY_TIER: Array<{
  key: TierKey;
  label: string;
  minDays: number;
  maxDays: number;
  tokens: string[];
}> = [
  {
    key: 'ECONOMY',
    label: 'Economy',
    minDays: 3,
    maxDays: 5,
    tokens: ['ups_ground_saver', 'usps_ground_advantage'],
  },
  {
    key: 'STANDARD',
    label: 'Standard (Recommended)',
    minDays: 2,
    maxDays: 3,
    tokens: ['ups_ground', 'usps_priority_mail'],
  },
  {
    key: 'EXPRESS',
    label: 'Express',
    minDays: 1,
    maxDays: 2,
    tokens: ['ups_2nd_day_air'],
  },
  {
    key: 'OVERNIGHT',
    label: 'Overnight',
    minDays: 1,
    maxDays: 1,
    tokens: ['ups_next_day_air_saver'],
  },
];

const TIER_ORDER: TierKey[] = ['ECONOMY', 'STANDARD', 'EXPRESS', 'OVERNIGHT'];

function normalizeString(value?: string): string {
  return (value || '').trim().toLowerCase();
}

export function normalizeShippoRates(
  shippoRates: Array<{
    objectId?: string;
    object_id?: string;
    amount?: string;
    currency?: string;
    provider?: string;
    servicelevel?: { name?: string; token?: string };
    estimatedDays?: number;
  }>
): NormalizedShippoRate[] {
  const mappedRates: NormalizedShippoRate[] = shippoRates.map((rate) => ({
    id: rate.object_id ?? rate.objectId ?? '',
    serviceName: rate.servicelevel?.name ?? rate.servicelevel?.token ?? 'Standard',
    carrier: rate.provider ?? 'Unknown',
    price: Number.parseFloat(rate.amount ?? '0'),
    currency: rate.currency ?? 'USD',
    deliveryDays: rate.estimatedDays,
    serviceToken: rate.servicelevel?.token,
  }));

  const tieredRates: NormalizedShippoRate[] = [];

  for (const tier of ALLOWED_TOKENS_BY_TIER) {
    const candidates = mappedRates.filter(
      (rate) => rate.price > 0 && rate.serviceToken && tier.tokens.includes(rate.serviceToken)
    );

    if (candidates.length === 0) {
      continue;
    }

    const cheapest = candidates.reduce((best, current) =>
      current.price < best.price ? current : best
    );

    tieredRates.push({
      ...cheapest,
      serviceName: tier.label,
      deliveryDays: tier.maxDays,
      tierKey: tier.key,
    });
  }

  if (tieredRates.length > 0) {
    return tieredRates.sort(
      (a, b) => TIER_ORDER.indexOf(a.tierKey!) - TIER_ORDER.indexOf(b.tierKey!)
    );
  }

  return mappedRates
    .filter((rate) => rate.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 4);
}

export function findMatchingShippingRate(
  rates: NormalizedShippoRate[],
  selectedShipping?: {
    rateId?: string;
    carrier?: string;
    serviceName?: string;
  } | null
): NormalizedShippoRate | undefined {
  if (!selectedShipping) {
    return rates[0];
  }

  if (selectedShipping.rateId) {
    const byId = rates.find((rate) => rate.id === selectedShipping.rateId);
    if (byId) {
      return byId;
    }
  }

  const selectedCarrier = normalizeString(selectedShipping.carrier);
  const selectedService = normalizeString(selectedShipping.serviceName);

  return rates.find(
    (rate) =>
      normalizeString(rate.carrier) === selectedCarrier &&
      normalizeString(rate.serviceName) === selectedService
  );
}
