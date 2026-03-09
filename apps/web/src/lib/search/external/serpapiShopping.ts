import type { ExternalResult } from "@/lib/search/types";

export async function serpapiShoppingSearch(args: {
    query: string;
    limit: number;
    traceId: string;
    debug: boolean;
}): Promise<ExternalResult[]> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams({
        engine: "google_shopping",
        q: args.query,
        api_key: apiKey,
        num: String(Math.min(Math.max(args.limit, 1), 20)),
        gl: "us",
        hl: "en",
    });

    const url = `https://serpapi.com/search?${params.toString()}`;

    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (args.debug) {
            console.info(`[search][${args.traceId}] serpapi.not_ok`, { status: res.status, text: text.slice(0, 300) });
        }
        return [];
    }

    const data: any = await res.json();
    const items: any[] = data?.shopping_results ?? [];

    const mapped: ExternalResult[] = items
        .map((item) => {
            const productUrl = item.merchant_link || item.offers_link || item.product_link || item.link || "";
            const rawSource = (item.source || "Web").toString();
            const source = rawSource.replace(".com", "").trim();
            const rawUrl =
                item.merchant_link ||
                item.offers_link ||
                item.product_link ||
                item.link ||
                "";

            const isGoogleWrapper =
                rawUrl.includes("google.com/search?ibp=oshop") ||
                rawUrl.includes("google.com/url?");

            const finalUrl = isGoogleWrapper && item.merchant_link ? item.merchant_link : rawUrl;

            return {
                title: (item.title || "").toString(),
                price: Number(item.extracted_price) || 0,
                source: source ? source[0].toUpperCase() + source.slice(1) : "Web",
                url: finalUrl,
                image: item.thumbnail || null,
            } satisfies ExternalResult;
        })
        .filter((r) => r.title && r.url && (r.url.startsWith("http://") || r.url.startsWith("https://")))
        .slice(0, args.limit);

    if (args.debug) {
        const googleWrapped = mapped.filter(r => r.url.includes("google.com")).length;
        console.info(`[search][${args.traceId}] serpapi.url_stats`, {
            returned: mapped.length,
            googleWrapped,
        });
    }

    return mapped;
}