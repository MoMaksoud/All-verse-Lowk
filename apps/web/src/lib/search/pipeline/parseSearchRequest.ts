import type { NextRequest } from "next/server";
import type {
    SearchRequest,
    SearchSource,
    ExternalProvider,
    SearchState,
} from "../types";

function isTruthy(v: string | null | undefined) {
    return v === "1" || v === "true" || v === "yes";
}

function parseSource(v: string | null): SearchSource {
    if (v === "internal" || v === "external" || v === "both") return v;
    return "external";
}

function parseProvider(v: string | null): ExternalProvider {
    if (v === "shopping" || v === "organic" || v === "auto") return v;
    return "auto";
}

function parseSearchState(raw: string | null): SearchState | undefined {
    if (!raw?.trim()) return undefined;
    try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === "object") return parsed as SearchState;
        return undefined;
    } catch {
        return undefined;
    }
}

export function parseSearchRequest(
    req: NextRequest
):
    | { ok: true; value: SearchRequest }
    | { ok: false; error: string; traceId: string } {
    const sp = req.nextUrl.searchParams;

    const traceId =
        req.headers.get("x-search-trace-id")?.trim() ||
        sp.get("traceId")?.trim() ||
        crypto.randomUUID();

    const debug = isTruthy(sp.get("debug")) || isTruthy(sp.get("debugSearch"));

    const searchState = parseSearchState(sp.get("searchState"));
    const q = (searchState?.rawQuery || sp.get("q") || "").trim();

    if (!q) {
        return {
            ok: false,
            error: 'Missing query param "q" (or searchState.rawQuery)',
            traceId,
        };
    }

    const limitRaw = sp.get("limit");
    const limit = Math.min(Math.max(Number(limitRaw ?? 12) || 12, 1), 50);

    const source = parseSource(sp.get("source"));
    const provider = parseProvider(sp.get("provider"));

    const refinementField = sp.get("refinementField")?.trim() || undefined;
    const refinementValue = sp.get("refinementValue")?.trim() || undefined;
    const lastUserMessage = sp.get("lastUserMessage")?.trim() || undefined;

    // conversational if we have a state or a refinement step
    const conversationalMode =
        isTruthy(sp.get("conversational")) ||
        Boolean(searchState) ||
        Boolean(refinementField);

    return {
        ok: true,
        value: {
            query: q,
            provider,
            traceId,
            debug,
            source,
            limit,
            searchState,
            refinementField,
            refinementValue,
            lastUserMessage,
            conversationalMode,
        },
    };
}