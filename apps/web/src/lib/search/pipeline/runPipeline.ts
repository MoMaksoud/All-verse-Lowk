import type {
    ExternalProvider,
    ExternalResult,
    InternalResult,
    RefinementQuestionResponse,
    SearchRequest,
    SearchResults,
    SearchResultsResponse,
    SearchResponse,
    SearchState,
} from "../types";

import { debugLog, startTimer } from "./debug";
import { simpleInternalSearch } from "../internal/simpleInternalSearch";
import { serpapiShoppingSearch } from "../external/serpapiShopping";
import { serpapiOrganicSearch } from "../external/serpapiOrgnaic";
import {
    evaluateResults as evaluateResultQuality,
    inferVertical,
    runRefinementEngine,
} from "./refinementEngine";
import { buildDeterministicRewrite } from "./refinementEngine/rewriteQuery";

import { updateSearchState } from "./refinements";
import { applyDeterministicQueryUnderstanding } from "./queryUnderstanding";

const MAX_REFINEMENT_TURNS = 2;
const SEARCH_REFINEMENT_V2_ENABLED = process.env.SEARCH_REFINEMENT_V2 !== "0";

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

async function runSearchSources(args: {
    req: SearchRequest;
    query: string;
    provider: ExternalProvider;
    state: SearchState;
    timings: Record<string, number>;
    timingPrefix: string;
}): Promise<{ internalResults: InternalResult[]; externalResults: ExternalResult[] }> {
    const { req, query, provider, state, timings, timingPrefix } = args;
    let internalResults: InternalResult[] = [];
    let externalResults: ExternalResult[] = [];

    if (req.source === "internal" || req.source === "both") {
        const t = startTimer();
        const internal = await simpleInternalSearch({
            query,
            limit: req.limit,
            debug: req.debug,
            searchState: state,
        });
        internalResults = internal.results;
        timings[`${timingPrefix}InternalSearch`] = t();

        debugLog(req.debug, req.traceId, "pipeline.internal.done", {
            query,
            returned: internalResults.length,
            ms: timings[`${timingPrefix}InternalSearch`],
            phase: timingPrefix,
        });
    }

    if (req.source === "external" || req.source === "both") {
        const t = startTimer();

        if (provider === "organic") {
            externalResults = await serpapiOrganicSearch({
                query,
                limit: req.limit,
                traceId: req.traceId,
                debug: req.debug,
            });
        } else {
            externalResults = await serpapiShoppingSearch({
                query,
                limit: req.limit,
                traceId: req.traceId,
                debug: req.debug,
            });
        }

        timings[`${timingPrefix}ExternalSearch`] = t();
        debugLog(req.debug, req.traceId, "pipeline.external.done", {
            query,
            provider,
            count: externalResults.length,
            ms: timings[`${timingPrefix}ExternalSearch`],
            phase: timingPrefix,
        });
    }

    return { internalResults, externalResults };
}

export async function runPipeline(req: SearchRequest): Promise<SearchResponse> {
    const timings: Record<string, number> = {};
    const tAll = startTimer();

    // conversational mode: if client is sending state/refinements, we can ask questions
    const conversationalMode =
        Boolean(req.conversationalMode) ||
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
    if (req.queryRewrite && !state.queryRewrite) {
        state.queryRewrite = req.queryRewrite;
    }
    if (typeof req.refinementTurn === "number" && Number.isFinite(req.refinementTurn) && state.refinementTurn == null) {
        state.refinementTurn = Math.max(0, Math.floor(req.refinementTurn));
    }
    const understanding = applyDeterministicQueryUnderstanding(
        state.queryRewrite?.trim() || req.query,
        state
    );
    let effectiveState: SearchState = { ...understanding.state };
    let effectiveQuery = understanding.query;
    let confidenceScore: number | undefined;
    let confidenceReasons: SearchResultsResponse["meta"]["confidenceReasons"];
    let inferredVertical = inferVertical(effectiveQuery, effectiveState);
    let rewriteUsed = effectiveQuery.trim().toLowerCase() !== req.query.trim().toLowerCase();
    let refinementTriggered = false;

    if (req.refinementField && req.refinementValue) {
        const deterministicRefinedQuery = buildDeterministicRewrite({
            query: effectiveState.rawQuery?.trim() || req.query,
            state: effectiveState,
            vertical: inferredVertical,
        });

        if (
            deterministicRefinedQuery &&
            deterministicRefinedQuery.trim().toLowerCase() !== effectiveQuery.trim().toLowerCase()
        ) {
            effectiveQuery = deterministicRefinedQuery;
            effectiveState.queryRewrite = deterministicRefinedQuery;
            rewriteUsed = true;
        }
    }

    debugLog(req.debug, req.traceId, "pipeline.query_understanding", {
        appliedRule: understanding.appliedRule ?? null,
        effectiveQuery,
        brand: effectiveState.brand ?? null,
        category: effectiveState.category ?? null,
    });

    // 2) resolve provider (auto -> organic/shopping)
    let provider: ExternalProvider =
        req.provider === "auto" ? chooseProviderAuto(effectiveQuery, effectiveState) : req.provider;

    // 3) run initial search
    const initial = await runSearchSources({
        req,
        query: effectiveQuery,
        provider,
        state: effectiveState,
        timings,
        timingPrefix: "initial",
    });

    let internalResults = initial.internalResults;
    let externalResults = initial.externalResults;
    let searchResults: SearchResults = {
        summary: null,
        internalResults,
        externalResults,
    };

    if (SEARCH_REFINEMENT_V2_ENABLED && conversationalMode) {
        const decision = await runRefinementEngine({
            query: effectiveQuery,
            results: searchResults,
            state: effectiveState,
            vertical: inferredVertical,
            maxTurns: MAX_REFINEMENT_TURNS,
            allowLlmRewrite: true,
            debug: req.debug,
            traceId: req.traceId,
        });

        inferredVertical = decision.vertical;
        effectiveState = decision.state;
        confidenceScore = decision.resultQuality.score;
        confidenceReasons = decision.resultQuality.reasons;
        rewriteUsed = rewriteUsed || decision.rewriteUsed;

        if (decision.action === "ask" && decision.question) {
            refinementTriggered = true;
            timings.total = tAll();

            const questionResponse: RefinementQuestionResponse = {
                traceId: req.traceId,
                meta: {
                    cacheHit: false,
                    timingsMs: timings,
                    source: req.source,
                    limit: req.limit,
                    provider,
                    confidenceScore,
                    confidenceReasons,
                    vertical: inferredVertical,
                    refinementTriggered: true,
                    refinementTurn: decision.question.turn,
                    rewriteUsed: false,
                },
                type: "refinement_question",
                question: decision.question.question,
                options: decision.question.options,
                field: decision.question.field,
                searchState: effectiveState,
                turn: decision.question.turn,
                maxTurns: decision.question.maxTurns,
                vertical: decision.question.vertical,
                reason: decision.question.reason,
            };

            debugLog(req.debug, req.traceId, "pipeline.refinement.ask", {
                field: decision.question.field,
                optionsCount: decision.question.options.length,
                qualityScore: decision.resultQuality.score,
                provider,
                totalMs: timings.total,
                vertical: inferredVertical,
            });

            return questionResponse;
        }

        if (decision.rewriteUsed && decision.rewrittenQuery && decision.rewrittenQuery !== effectiveQuery) {
            effectiveQuery = decision.rewrittenQuery;
            effectiveState.queryRewrite = decision.rewrittenQuery;
            rewriteUsed = true;
            provider = req.provider === "auto"
                ? chooseProviderAuto(effectiveQuery, effectiveState)
                : req.provider;

            const rewriteRound = await runSearchSources({
                req,
                query: effectiveQuery,
                provider,
                state: effectiveState,
                timings,
                timingPrefix: "rewrite",
            });
            internalResults = rewriteRound.internalResults;
            externalResults = rewriteRound.externalResults;
            searchResults = {
                summary: null,
                internalResults,
                externalResults,
            };
        }
    } else {
        const quality = evaluateResultQuality({
            query: effectiveQuery,
            vertical: inferredVertical,
            state: effectiveState,
            results: searchResults,
        });
        confidenceScore = quality.score;
        confidenceReasons = quality.reasons;
    }

    timings.total = tAll();
    debugLog(req.debug, req.traceId, "pipeline.done", { totalMs: timings.total });
    const response: SearchResultsResponse = {
        traceId: req.traceId,
        meta: {
            cacheHit: false,
            timingsMs: timings,
            source: req.source,
            limit: req.limit,
            provider,
            confidenceScore,
            confidenceReasons,
            vertical: inferredVertical,
            refinementTriggered,
            refinementTurn: effectiveState.refinementTurn ?? 0,
            rewriteUsed,
        },
        data: {
            query: effectiveQuery,
            searchState: effectiveState,
            summary: null,
            internalResults,
            externalResults,
        },
    };
    return response;
}
