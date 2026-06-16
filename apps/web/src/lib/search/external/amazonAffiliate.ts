import type { ExternalResult } from "@/lib/search/types";

const AMAZON_SOURCE = "Amazon";
const AMAZON_PRODUCT_LIMIT = 6;
const AMAZON_INSERT_INDEX = 3;

function cleanQuery(query: string): string {
    return query.replace(/\s+/g, " ").trim().slice(0, 120);
}

function buildAmazonSearchUrl(query: string): string {
    const params = new URLSearchParams({
        k: query,
    });

    return `https://www.amazon.com/s?${params.toString()}`;
}

function isAmazonHost(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/^www\./, "");
    return host === "amazon.com" || host.endsWith(".amazon.com");
}

function isAmazonUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    try {
        return isAmazonHost(new URL(url).hostname);
    } catch {
        return false;
    }
}

function sourceLooksAmazon(source: string | null | undefined): boolean {
    return Boolean(source?.toLowerCase().includes("amazon"));
}

function toFiniteNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value.replace(/[$,]/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

function getAmazonProductLimit(): number {
    return AMAZON_PRODUCT_LIMIT;
}

function getInsertIndex(resultCount: number): number {
    return Math.min(AMAZON_INSERT_INDEX, resultCount);
}

function getResultKey(result: ExternalResult): string {
    try {
        const parsed = new URL(result.url);
        parsed.searchParams.delete("tag");
        return parsed.toString().toLowerCase();
    } catch {
        return `${result.source}:${result.title}`.toLowerCase();
    }
}

function markAmazonResult(result: ExternalResult): ExternalResult {
    return {
        ...result,
        source: AMAZON_SOURCE,
    };
}

function buildSearchResult(query: string): ExternalResult {
    return {
        title: `Shop ${query} on Amazon`,
        price: 0,
        source: AMAZON_SOURCE,
        url: buildAmazonSearchUrl(query),
        image: null,
    };
}

async function fetchAmazonProductResults(args: {
    query: string;
    traceId: string;
    debug: boolean;
}): Promise<ExternalResult[]> {
    const apiKey = process.env.SERPAPI_API_KEY;
    const limit = getAmazonProductLimit();
    if (!apiKey || limit <= 0) return [];

    const params = new URLSearchParams({
        engine: "amazon",
        amazon_domain: "amazon.com",
        k: args.query,
        api_key: apiKey,
    });

    const res = await fetch(`https://serpapi.com/search?${params.toString()}`, {
        method: "GET",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (args.debug) {
            console.info(`[search][${args.traceId}] amazon_affiliate.not_ok`, {
                status: res.status,
                text: text.slice(0, 250),
            });
        }
        return [];
    }

    const data: any = await res.json();
    const items: Record<string, unknown>[] = Array.isArray(data?.organic_results)
        ? data.organic_results
        : [];

    const results = items
        .flatMap((item): ExternalResult[] => {
            const title = typeof item.title === "string" ? item.title.trim() : "";
            if (!title) return [];

            const rawUrl = typeof item.link === "string" ? item.link : "";
            const url = isAmazonUrl(rawUrl)
                ? rawUrl
                : buildAmazonSearchUrl(title);
            const image =
                typeof item.thumbnail === "string"
                    ? item.thumbnail
                    : typeof item.image === "string"
                        ? item.image
                        : null;

            return [
                {
                    title,
                    price: toFiniteNumber(item.extracted_price ?? item.price),
                    source: AMAZON_SOURCE,
                    url,
                    image,
                    rating: toFiniteNumber(item.rating) || null,
                    reviewsCount: toFiniteNumber(item.reviews ?? item.reviews_count ?? item.ratings_total) || null,
                },
            ];
        })
        .filter((result) => result.url.startsWith("http://") || result.url.startsWith("https://"));

    const seen = new Set<string>();
    const deduped = results.filter((result) => {
        const key = getResultKey(result);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    if (args.debug) {
        console.info(`[search][${args.traceId}] amazon_affiliate.products`, {
            total: items.length,
            returned: deduped.length,
        });
    }

    return deduped.slice(0, limit);
}

export async function getAmazonAffiliateResults(args: {
    query: string;
    traceId: string;
    debug: boolean;
}): Promise<ExternalResult[]> {
    const query = cleanQuery(args.query);
    if (!query) return [];

    const productResults = await fetchAmazonProductResults({
        query,
        traceId: args.traceId,
        debug: args.debug,
    });

    if (productResults.length > 0) return productResults;
    return [buildSearchResult(query)];
}

export function insertAmazonAffiliateResults(args: {
    externalResults: ExternalResult[];
    amazonResults: ExternalResult[];
}): ExternalResult[] {
    if (args.amazonResults.length === 0) return args.externalResults;

    const existing = args.externalResults.map((result) =>
        sourceLooksAmazon(result.source) || isAmazonUrl(result.url)
            ? markAmazonResult(result)
            : result
    );
    const seen = new Set(existing.map(getResultKey));
    const newAmazonResults = args.amazonResults.filter((result) => {
        const key = getResultKey(result);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    if (newAmazonResults.length === 0) return existing;

    const insertIndex = getInsertIndex(args.externalResults.length);
    return [
        ...existing.slice(0, insertIndex),
        ...newAmazonResults,
        ...existing.slice(insertIndex),
    ];
}
