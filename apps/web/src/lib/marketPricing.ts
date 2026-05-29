import { serpapiShoppingSearch } from "@/lib/search/external/serpapiShopping";
import { simpleInternalSearch } from "@/lib/search/internal/simpleInternalSearch";

export type MarketComparable = {
  title: string;
  price: number;
  source: string;
};

export type MarketPricingResult = {
  query: string;
  suggestedPrice: number | null;
  priceRange: { min: number; max: number } | null;
  confidence: number;
  marketDemand: "high" | "medium" | "low";
  competitorCount: number;
  comparables: MarketComparable[];
  notes: string;
};

function cleanPart(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || /^unknown|various|standard|null|undefined$/i.test(trimmed)) return "";
  return trimmed;
}

function buildQuery(args: {
  title?: string;
  category?: string;
  brand?: string;
  model?: string;
  productType?: string;
}) {
  const parts = [
    cleanPart(args.brand),
    cleanPart(args.model),
    cleanPart(args.title),
    cleanPart(args.productType),
    cleanPart(args.category),
  ];

  const seen = new Set<string>();
  return parts
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}

function trimOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const mid = median(prices);
  if (mid <= 0) return prices;
  return prices.filter((price) => price >= mid * 0.35 && price <= mid * 2.75);
}

function toComparable(result: { title: string; price: number; source?: string }): MarketComparable | null {
  const price = Number(result.price);
  if (!result.title?.trim() || !Number.isFinite(price) || price <= 0) return null;
  return {
    title: result.title.trim().slice(0, 160),
    price,
    source: result.source || "Marketplace",
  };
}

export async function getMarketPricing(args: {
  title?: string;
  description?: string;
  category?: string;
  condition?: string;
  brand?: string;
  model?: string;
  productType?: string;
  limit?: number;
  traceId?: string;
  debug?: boolean;
}): Promise<MarketPricingResult> {
  const query = buildQuery(args);

  if (!query) {
    return {
      query: "",
      suggestedPrice: null,
      priceRange: null,
      confidence: 0,
      marketDemand: "low",
      competitorCount: 0,
      comparables: [],
      notes: "No specific product query was available for market pricing.",
    };
  }

  const limit = Math.min(Math.max(args.limit ?? 12, 3), 20);
  const traceId = args.traceId || crypto.randomUUID();

  const [externalResults, internalSearch] = await Promise.all([
    serpapiShoppingSearch({
      query,
      limit,
      traceId,
      debug: Boolean(args.debug),
    }).catch((error) => {
      if (args.debug) console.info("[market-pricing] external search failed", error);
      return [];
    }),
    simpleInternalSearch({
      query,
      limit: Math.min(limit, 8),
      debug: Boolean(args.debug),
    }).catch((error) => {
      if (args.debug) console.info("[market-pricing] internal search failed", error);
      return { results: [], fetched: 0 };
    }),
  ]);

  const comparables = [
    ...externalResults.map(toComparable),
    ...(internalSearch.results || []).map((item) =>
      toComparable({ title: item.title, price: item.price, source: "AllVerse" })
    ),
  ]
    .filter((item): item is MarketComparable => Boolean(item))
    .slice(0, limit);

  const prices = trimOutliers(comparables.map((item) => item.price));

  if (prices.length === 0) {
    return {
      query,
      suggestedPrice: null,
      priceRange: null,
      confidence: 0.15,
      marketDemand: "low",
      competitorCount: comparables.length,
      comparables,
      notes: "No usable comparable prices were found.",
    };
  }

  const suggestedPrice = Math.max(1, Math.round(median(prices)));
  const rangeMin = Math.max(1, Math.round(percentile(prices, 0.2)));
  const rangeMax = Math.max(rangeMin, Math.round(percentile(prices, 0.8)));
  const externalCount = comparables.filter((item) => item.source !== "AllVerse").length;
  const confidence = Math.min(
    0.92,
    Math.max(0.3, 0.28 + prices.length * 0.06 + externalCount * 0.03)
  );

  return {
    query,
    suggestedPrice,
    priceRange: { min: rangeMin, max: rangeMax },
    confidence,
    marketDemand: prices.length >= 8 ? "high" : prices.length >= 3 ? "medium" : "low",
    competitorCount: comparables.length,
    comparables,
    notes:
      prices.length >= 3
        ? "Pricing is based on current comparable marketplace results."
        : "Pricing is based on limited comparable data and should be reviewed by the seller.",
  };
}

export function formatMarketPricingForPrompt(market: MarketPricingResult): string {
  if (!market.query) return "No market query available.";

  const lines = market.comparables
    .slice(0, 10)
    .map((item) => `${item.source}: $${item.price} - ${item.title}`);

  return [
    `Market query: ${market.query}`,
    `Suggested price: ${market.suggestedPrice == null ? "unknown" : `$${market.suggestedPrice}`}`,
    `Price range: ${
      market.priceRange == null ? "unknown" : `$${market.priceRange.min}-$${market.priceRange.max}`
    }`,
    `Confidence: ${market.confidence.toFixed(2)}`,
    `Comparable count: ${market.competitorCount}`,
    `Notes: ${market.notes}`,
    lines.length ? `Comparable listings:\n${lines.join("\n")}` : "Comparable listings: none",
  ].join("\n");
}
