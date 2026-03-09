import type { ExternalResult } from "@/lib/search/types";

export async function serpapiOrganicSearch(args: {
    query: string;
    limit: number;
    traceId: string;
    debug: boolean;
}): Promise<ExternalResult[]> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams({
        engine: "google",
        q: args.query,
        api_key: apiKey,
        num: String(Math.min(Math.max(args.limit, 1), 10)),
        gl: "us",
        hl: "en",
    });

    const url = `https://serpapi.com/search?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (args.debug) console.info(`[search][${args.traceId}] serpapi_organic.not_ok`, { status: res.status, text: text.slice(0, 250) });
        return [];
    }

    const data: any = await res.json();
    const organic: any[] = data?.organic_results ?? [];

    const mapped: ExternalResult[] = organic
        .map((item) => {
            const snippet = (item.snippet || "").toString() || null;

            const image =
                item.thumbnail ||
                item.thumbnailUrl ||
                item?.pagemap?.cse_image?.[0]?.src ||
                null;

            const link = (item.link || "").toString();
            return {
                title: (item.title || "").toString(),
                price: extractPriceFromText(snippet) || 0,
                source: sourceFromUrl(link),
                url: link,
                image,
                snippet,
            };
        })
        .filter(r => r.title && r.url && (r.url.startsWith("http://") || r.url.startsWith("https://")))
        .slice(0, args.limit);

    if (args.debug) {
        console.info(`[search][${args.traceId}] serpapi_organic.ok`, {
            total: organic.length,
            returned: mapped.length,
            keys: Object.keys(data || {}),
        });
    }

    return mapped;
}

// Functions to help extract source and price from the SerpAPI organic results, which can be a bit inconsistent in format
function sourceFromUrl(u: string) {
    try {
        const host = new URL(u).hostname.replace("www.", "");
        const base = host.split(".")[0];
        return base ? base[0].toUpperCase() + base.slice(1) : "Web";
    } catch {
        return "Web";
    }
}

function extractPriceFromText(text: string | null): number {
  if (!text) return 0;
  const m = text.match(/\$([\d,]+(\.\d{1,2})?)/);
  if (!m) return 0;
  return Number(m[1].replace(/,/g, "")) || 0;
}