import type {
    RefinementQuestion,
    RefinementQuestionResponse,
    SearchRequest,
    SearchResults,
    SearchResultsResponse,
    SearchState,
    ServerSearchResponse,
} from "./types";
import { normalizeSearchState } from "./state";
import { runPipeline } from "./pipeline/runPipeline";

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
    let resolvedQuery = args.query;

    let state: SearchState = {
        rawQuery: args.query,
        category: args.category || undefined,
        brand: args.brand ? [args.brand] : undefined,
        model: args.model?.trim() || undefined,
        refinementTurn: typeof args.refinementTurn === "number" ? Math.max(0, Math.floor(args.refinementTurn)) : 0,
        queryRewrite: args.queryRewrite?.trim() || undefined,
    };

    // If searchState was already passed from a prior refinement step, prefer it
    if (args.searchStateParam) {
        try {
            const decoded = decodeURIComponent(args.searchStateParam);
            const parsed = JSON.parse(decoded) as SearchState;
            if (parsed && typeof parsed === "object") {
                state = normalizeSearchState(parsed);
                if (!state.rawQuery) state.rawQuery = args.query;
            }
        } catch {
            // ignore bad searchState and fall back to generated state
        }
    }
    state = normalizeSearchState(state);

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

        const request: SearchRequest = {
            query: state.rawQuery || args.query,
            provider: "auto",
            traceId: searchId,
            debug: debugSearch,
            source: "both",
            limit: 12,
            searchState: state,
            refinementField: args.refinementField,
            refinementValue: args.refinementValue,
            refinementTurn:
                typeof args.refinementTurn === "number" && Number.isFinite(args.refinementTurn)
                    ? Math.max(0, Math.floor(args.refinementTurn))
                    : state.refinementTurn,
            queryRewrite: args.queryRewrite?.trim() || state.queryRewrite,
            lastUserMessage: state.rawQuery || args.query,
            conversationalMode: Boolean(args.searchStateParam || args.refinementField),
        };

        debugLog(debugSearch, searchId, "serverSearch.pipeline.request", {
            query: request.query,
            provider: request.provider,
            source: request.source,
            conversationalMode: request.conversationalMode,
            refinementField: request.refinementField,
        });

        const payload = (await runPipeline(request)) as
            | ApiResultsPayload
            | ApiRefinementPayload;

        debugLog(debugSearch, searchId, "serverSearch.pipeline.response", {
            durationMs: Date.now() - startedAt,
            type: isApiRefinementPayload(payload) ? "refinement_question" : "results",
        });

        let results: SearchResults | null = null;
        let refinementQuestion: RefinementQuestion | null = null;

        if (isApiRefinementPayload(payload)) {
            resolvedQuery =
                payload.searchState?.queryRewrite?.trim() ||
                payload.searchState?.rawQuery?.trim() ||
                args.query;
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
            resolvedQuery =
                (typeof payload.data.query === "string" && payload.data.query.trim()) ||
                args.query;
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
            query: resolvedQuery,
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
            query: resolvedQuery,
            imageSearch: args.imageSearch,
            results: null,
            refinementQuestion: null,
            error: e?.message ?? "Search failed.",
            searchId,
        };
    }
}
