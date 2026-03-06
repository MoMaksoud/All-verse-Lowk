import type {
    SearchRequest,
    SearchResponse,
    SearchState,
    ExternalProvider,
} from "../types";

import { debugLog, startTimer } from "./debug";
import { simpleInternalSearch } from "../internal/simpleInternalSearch";
import { serpapiShoppingSearch } from "../external/serpapiShopping";
import { serpapiOrganicSearch } from "../external/serpapiOrgnaic";

import { updateSearchState, decideRefinementQuestion } from "./refinements";

// provider=auto selection (cheap heuristic; intent wins)
function chooseProviderAuto(query: string, state?: SearchState): ExternalProvider {

    if (state?.intent === "info") return "organic";
    if (state?.intent === "shopping") return "shopping";

    const q = query.toLowerCase();

    // info-ish signals
    const infoSignals = [
        "how to",
        "what is",
        "review",
        "reviews",
        "spec",
        "specs",
        "kbb",
        "edmunds",
        "cargurus",
        "carfax",
        "jdpower",
    ];
    if (infoSignals.some((s) => q.includes(s))) return "organic";

    // shopping-ish signals
    const buySignals = ["buy", "price", "$", "deal", "for sale", "near me", "used", "new"];
    if (buySignals.some((s) => q.includes(s))) return "shopping";

    // default to shopping for marketplace UX
    return "shopping";
}

export async function runPipeline(req: SearchRequest): Promise<SearchResponse> {
    const timings: Record<string, number> = {};
    const tAll = startTimer();

    // conversational mode: if client is sending state/refinements, we can ask questions
    const conversationalMode =
        Boolean(req.searchState) ||
        Boolean(req.refinementField) ||
        Boolean(req.refinementValue) ||
        Boolean(req.lastUserMessage);

    debugLog(req.debug, req.traceId, "pipeline.start", {
        query: req.query,
        source: req.source,
        limit: req.limit,
        provider: req.provider,
        conversationalMode,
        hasSearchState: Boolean(req.searchState),
        refinementField: req.refinementField,
    });

    // 1) build/normalize state + apply refinement consistently
    const state: SearchState = updateSearchState(
        req.searchState ?? {},
        req.refinementField,
        req.refinementValue,
        req.query
    );

    // 2) resolve provider (auto -> organic/shopping)
    const provider: ExternalProvider =
        req.provider === "auto" ? chooseProviderAuto(req.query, state) : req.provider;

    let internalResults: any[] = [];
    let externalResults: any[] = [];

    // 3) internal search
    if (req.source === "internal" || req.source === "both") {
        const t = startTimer();
        const internal = await simpleInternalSearch({
            query: req.query,
            limit: req.limit,
            debug: req.debug,
        });
        internalResults = internal.results;
        timings.internalSearch = t();

        debugLog(req.debug, req.traceId, "pipeline.internal.done", {
            returned: internalResults.length,
            ms: timings.internalSearch,
        });
    }

    // 4) external search
    if (req.source === "external" || req.source === "both") {
        const t = startTimer();

        if (provider === "organic") {
            externalResults = await serpapiOrganicSearch({
                query: req.query,
                limit: req.limit,
                traceId: req.traceId,
                debug: req.debug,
            });
        } else {
            externalResults = await serpapiShoppingSearch({
                query: req.query,
                limit: req.limit,
                traceId: req.traceId,
                debug: req.debug,
            });
        }

        timings.externalSearch = t();
        debugLog(req.debug, req.traceId, "pipeline.external.done", {
            provider,
            count: externalResults.length,
            ms: timings.externalSearch,
        });
    }

    const resultCount = internalResults.length + externalResults.length;

    // 5) conversational refinement question (rule-based for now)
    if (conversationalMode) {
        const q = decideRefinementQuestion({
            query: req.query,
            state,
            resultCount,
            provider,
        });

        if (q) {
            timings.total = tAll();

            debugLog(req.debug, req.traceId, "pipeline.refinement.ask", {
                field: q.field,
                optionsCount: q.options.length,
                resultCount,
                provider,
                totalMs: timings.total,
            });

            return {
                traceId: req.traceId,
                meta: {
                    cacheHit: false,
                    timingsMs: timings,
                    source: req.source,
                    limit: req.limit,
                    provider,
                },
                type: "refinement_question",
                question: q.question,
                options: q.options,
                field: q.field,
                searchState: state,
            };
        }
    }

    timings.total = tAll();
    debugLog(req.debug, req.traceId, "pipeline.done", { totalMs: timings.total });
    console.warn("Internal results:", internalResults);
    // 6) normal results
    return {
        traceId: req.traceId,
        meta: {
            cacheHit: false,
            timingsMs: timings,
            source: req.source,
            limit: req.limit,
            provider,
        },
        data: {
            query: req.query,
            searchState: state,
            internalResults,
            externalResults,
        },
    };
}