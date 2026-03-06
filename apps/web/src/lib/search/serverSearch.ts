import type {
    RefinementQuestion,
    RefinementQuestionResponse,
    SearchResults,
    SearchResultsResponse,
    SearchState,
    ServerSearchResponse,
} from "./types";

function isDebugSearchEnabled(value: string | undefined): boolean {
    return value === "1" || value === "true";
}

function debugLog(
    enabled: boolean,
    traceId: string,
    phase: string,
    details?: Record<string, unknown>
) {
    if (!enabled) return;
    if (details) {
        console.warn(`[search-debug][${traceId}] ${phase}`, details);
        return;
    }
    console.warn(`[search-debug][${traceId}] ${phase}`);
}

async function logSearchEvent(args: {
    searchId: string;
    query: string;
    state?: Partial<SearchState>;
    imageSearch: boolean;
    resultCount: number;
}) {
    // Write to Firestore with Admin SDK:
    // searches/{searchId} + sessions/{sid}/events/{eid}
}

function randomId() {
    return crypto.randomUUID();
}

function getServerBaseUrl(): string {
    if (process.env.NODE_ENV !== "production") {
        const port = process.env.PORT || "3000";
        return `http://localhost:${port}`;
    }

    const configured =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL;

    if (configured && configured.trim().length > 0) {
        return configured.replace(/\/+$/, "");
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return "http://localhost:3000";
}

/**
 * Shape returned by /api/search when it asks a follow-up question
 */
type ApiRefinementPayload = RefinementQuestionResponse;

/**
 * Shape returned by /api/search when it returns results
 */
type ApiResultsPayload = SearchResultsResponse;

function isApiRefinementPayload(payload: unknown): payload is ApiRefinementPayload {
    if (!payload || typeof payload !== "object") return false;
    const record = payload as Record<string, unknown>;
    return (
        record.type === "refinement_question" &&
        typeof record.question === "string" &&
        Array.isArray(record.options) &&
        typeof record.field === "string" &&
        !!record.searchState &&
        typeof record.searchState === "object"
    );
}

function isApiResultsPayload(payload: unknown): payload is ApiResultsPayload {
    if (!payload || typeof payload !== "object") return false;
    const record = payload as Record<string, unknown>;
    if (!record.data || typeof record.data !== "object") return false;

    const data = record.data as Record<string, unknown>;
    return Array.isArray(data.internalResults) && Array.isArray(data.externalResults);
}

export async function serverSearch(args: {
    query: string;
    imageSearch: boolean;
    brand?: string;
    model?: string;
    category?: string;
    debugSearch?: boolean;

    // ✅ new
    searchStateParam?: string;
    refinementField?: RefinementQuestion["field"];
    refinementValue?: string;
    refinementTurn?: number;
    queryRewrite?: string;
}): Promise<ServerSearchResponse> {
    const searchId = randomId();
    const debugSearch =
        args.debugSearch ?? isDebugSearchEnabled(process.env.DEBUG_SEARCH);
    const startedAt = Date.now();

    let state: SearchState = {
        rawQuery: args.query,
        category: args.category || undefined,
        brand: args.brand ? [args.brand] : undefined,
        attributes: args.model ? { model: args.model } : undefined,
        refinementTurn: typeof args.refinementTurn === "number" ? Math.max(0, Math.floor(args.refinementTurn)) : 0,
        queryRewrite: args.queryRewrite?.trim() || undefined,
    };

    // If searchState was already passed from a prior refinement step, prefer it
    if (args.searchStateParam) {
        try {
            const decoded = decodeURIComponent(args.searchStateParam);
            const parsed = JSON.parse(decoded) as SearchState;
            if (parsed && typeof parsed === "object") {
                state = parsed;
                if (!state.rawQuery) state.rawQuery = args.query;
            }
        } catch {
            // ignore bad searchState and fall back to generated state
        }
    }

    try {
        debugLog(debugSearch, searchId, "serverSearch.start", {
            query: args.query,
            imageSearch: args.imageSearch,
            brand: args.brand,
            model: args.model,
            category: args.category,
            searchStateParam: args.searchStateParam,
            refinementField: args.refinementField,
            refinementValue: args.refinementValue,
            refinementTurn: args.refinementTurn,
            queryRewrite: args.queryRewrite,
        });

        const params = new URLSearchParams({
            q: state.rawQuery || args.query,
            provider: "auto",
            source: "both",
            debugSearch: debugSearch ? "1" : "0",
            traceId: searchId,
        });

        // conversational mode if state/refinement exists
        if (args.searchStateParam || args.refinementField) {
            params.set("conversational", "1");
        }

        // always pass state if we have it
        params.set("searchState", JSON.stringify(state));
        params.set("lastUserMessage", state.rawQuery || args.query);

        if (args.refinementField) {
            params.set("refinementField", args.refinementField);
        }
        if (args.refinementValue) {
            params.set("refinementValue", args.refinementValue);
        }
        if (typeof args.refinementTurn === "number" && Number.isFinite(args.refinementTurn)) {
            params.set("refinementTurn", String(Math.max(0, Math.floor(args.refinementTurn))));
        }
        if (args.queryRewrite?.trim()) {
            params.set("queryRewrite", args.queryRewrite.trim());
        }

        debugLog(debugSearch, searchId, "serverSearch.api.request", {
            baseUrl: getServerBaseUrl(),
            path: "/api/search",
            params: params.toString(),
        });

        const response = await fetch(
            `${getServerBaseUrl()}/api/search?${params.toString()}`,
            {
                method: "GET",
                cache: "no-store",
                headers: {
                    "x-search-trace-id": searchId,
                    "x-search-debug": debugSearch ? "1" : "0",
                },
            }
        );

        debugLog(debugSearch, searchId, "serverSearch.api.response", {
            status: response.status,
            ok: response.ok,
            durationMs: Date.now() - startedAt,
        });

        if (!response.ok) {
            const errorPayload = await response
                .json()
                .catch(() => ({} as { error?: string; traceId?: string }));

            debugLog(debugSearch, searchId, "serverSearch.api.error", errorPayload);

            throw new Error(errorPayload.error || "Search failed.");
        }

        const payload = (await response.json()) as
            | ApiResultsPayload
            | ApiRefinementPayload;

        let results: SearchResults | null = null;
        let refinementQuestion: RefinementQuestion | null = null;

        if (isApiRefinementPayload(payload)) {
            refinementQuestion = {
                field: payload.field,
                question: payload.question,
                options: payload.options,
                searchState: payload.searchState ?? state,
                turn: payload.turn ?? ((payload.searchState?.refinementTurn ?? state.refinementTurn ?? 0) + 1),
                maxTurns: payload.maxTurns ?? 2,
                vertical: payload.vertical ?? payload.searchState?.vertical ?? "general",
                reason: payload.reason ?? "Need one more detail to improve precision.",
            };
        } else if (isApiResultsPayload(payload)) {
            results = {
                summary: payload.data.summary ?? null,
                internalResults: payload.data.internalResults ?? [],
                externalResults: payload.data.externalResults ?? [],
            };
        } else {
            throw new Error("Unexpected search response shape.");
        }

        const count =
            (results?.internalResults?.length || 0) +
            (results?.externalResults?.length || 0);

        debugLog(debugSearch, searchId, "serverSearch.completed", {
            hasResults: Boolean(results),
            hasRefinementQuestion: Boolean(refinementQuestion),
            resultCount: count,
            durationMs: Date.now() - startedAt,
        });

        await logSearchEvent({
            searchId,
            query: args.query,
            state,
            imageSearch: args.imageSearch,
            resultCount: count,
        });

        return {
            query: args.query,
            imageSearch: args.imageSearch,
            results,
            refinementQuestion,
            error: null,
            searchId,
        };
    } catch (e: any) {
        debugLog(debugSearch, searchId, "serverSearch.failed", {
            message: e?.message ?? "Search failed.",
            durationMs: Date.now() - startedAt,
        });

        return {
            query: args.query,
            imageSearch: args.imageSearch,
            results: null,
            refinementQuestion: null,
            error: e?.message ?? "Search failed.",
            searchId,
        };
    }
}
