"use client";

import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Search, ArrowLeft, Home, Camera, MessageCircle } from "lucide-react";

import { AISummarySection } from "@/components/search/AISummarySection";
import { ExternalResultsSection } from "@/components/search/ExternalResultsSection";
import { InternalResultsSection } from "@/components/search/InternalResultsSection";
import { SellCTASection } from "@/components/search/SellCTASection";
import { LoadingSpinner } from "@/components/LoadingSpinner";

import { getPopularSearches } from "@/lib/searchAnalytics";
import { normalizeSearchState } from "@/lib/search/state";
import type {
    ClientRefinementQuestion,
    ClientSearchResults,
    RefinementQuestionResponse,
    SearchState,
    SearchResponse,
    SearchResultsResponse,
    ServerRefinementQuestion,
    ServerSearchResults,
} from "@/lib/search/types";

type ShellRefinementQuestion = ClientRefinementQuestion | ServerRefinementQuestion;
type ShellInitialResults = ClientSearchResults | ServerSearchResults | null;
type InternalResult = ClientSearchResults["internalResults"][number];
type ExternalResult = ClientSearchResults["externalResults"][number];
type Summary = ClientSearchResults["summary"];

interface SearchClientShellProps {
    initialQuery: string;
    imageSearch: boolean;
    initialResults: ShellInitialResults;
    initialRefinementQuestion: ShellRefinementQuestion | null;
    initialError: string | null;
    searchId: string;
    debugSearch?: boolean;
}

function optionToValue(field: string, option: string): string {
    const v = option.trim().toLowerCase();
    if (field === "priceIntent") {
        if (v === "cheap") return "cheap";
        if (v === "premium") return "premium";
        if (v === "best value" || v === "mid") return "mid";
    }
    if (field === "condition") {
        if (v === "new") return "new";
        if (v === "used") return "used";
    }
    return option.trim();
}

function toFiniteNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toOptionalStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return items.length > 0 ? items : undefined;
}

function toSourceFromUrl(url: string): string {
    try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        return host || "Web";
    } catch {
        return "Web";
    }
}

function normalizeSummary(summary: unknown): Summary {
    if (typeof summary === "string") {
        const overview = summary.trim();
        return overview ? { overview } : null;
    }

    if (!summary || typeof summary !== "object") {
        return null;
    }

    const record = summary as Record<string, unknown>;
    if (typeof record.overview !== "string" || !record.overview.trim()) {
        return null;
    }

    const priceRange =
        record.priceRange &&
            typeof record.priceRange === "object" &&
            typeof (record.priceRange as { min?: unknown }).min === "number" &&
            typeof (record.priceRange as { max?: unknown }).max === "number" &&
            typeof (record.priceRange as { average?: unknown }).average === "number"
            ? {
                min: (record.priceRange as { min: number }).min,
                max: (record.priceRange as { max: number }).max,
                average: (record.priceRange as { average: number }).average,
            }
            : undefined;

    return {
        overview: record.overview,
        priceRange,
        topRecommendations: toOptionalStringArray(record.topRecommendations),
        marketInsights: toOptionalStringArray(record.marketInsights),
    };
}

function normalizeInternalResults(results: unknown): InternalResult[] {
    if (!Array.isArray(results)) return [];

    return results.flatMap((item, index) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;

        const title = typeof record.title === "string" && record.title.trim() ? record.title : "Untitled Listing";
        const id = typeof record.id === "string" && record.id.trim() ? record.id : `internal-${index}-${title}`;
        const photos = Array.isArray(record.photos)
            ? record.photos.filter((photo): photo is string => typeof photo === "string" && photo.trim().length > 0)
            : [];
        const condition = record.condition === "new" || record.condition === "used" ? record.condition : "used";

        return [
            {
                id,
                title,
                price: toFiniteNumber(record.price, 0),
                description: typeof record.description === "string" ? record.description : "",
                photos,
                category: typeof record.category === "string" ? record.category : "other",
                condition,
                sellerId: typeof record.sellerId === "string" ? record.sellerId : "",
                isMatched: typeof record.isMatched === "boolean" ? record.isMatched : undefined,
            },
        ];
    });
}

function normalizeExternalResults(results: unknown): ExternalResult[] {
    if (!Array.isArray(results)) return [];

    return results.flatMap((item, index) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;

        const title = typeof record.title === "string" && record.title.trim() ? record.title : "Untitled Result";
        const fallbackUrl = typeof record.id === "string" && record.id.trim() ? record.id : `external-${index}`;
        const url = typeof record.url === "string" && record.url.trim() ? record.url : fallbackUrl;

        return [
            {
                title,
                price: toFiniteNumber(record.price, 0),
                source: typeof record.source === "string" && record.source.trim() ? record.source : toSourceFromUrl(url),
                url,
                image: typeof record.image === "string" ? record.image : null,
                rating: typeof record.rating === "number" ? record.rating : null,
                reviewsCount: typeof record.reviewsCount === "number" ? record.reviewsCount : null,
            },
        ];
    });
}

function normalizeSearchResults(results: ShellInitialResults): ClientSearchResults | null {
    if (!results || typeof results !== "object") return null;

    return {
        summary: normalizeSummary((results as Record<string, unknown>).summary),
        internalResults: normalizeInternalResults((results as Record<string, unknown>).internalResults),
        externalResults: normalizeExternalResults((results as Record<string, unknown>).externalResults),
    };
}

function getRefinementSearchState(
    refinement: ShellRefinementQuestion | null
): SearchState | null {
    if (!refinement || typeof refinement !== "object") return null;
    if ("searchState" in refinement && refinement.searchState && typeof refinement.searchState === "object") {
        return normalizeSearchState(refinement.searchState);
    }
    return null;
}

function normalizeRefinementQuestion(
    refinement: ShellRefinementQuestion | null
): ShellRefinementQuestion | null {
    if (!refinement) return null;
    const searchState = getRefinementSearchState(refinement);
    return searchState ? { ...refinement, searchState } : refinement;
}

function buildSearchPageUrl(args: {
    query: string;
    searchState?: SearchState | null;
    debugSearch: boolean;
    imageSearch: boolean;
}): string {
    const params = new URLSearchParams();
    params.set("query", args.query);

    if (args.searchState) {
        params.set("searchState", JSON.stringify(args.searchState));
    }

    if (args.debugSearch) {
        params.set("debugSearch", "1");
    }

    if (args.imageSearch) {
        params.set("imageSearch", "true");
    }

    return `/search?${params.toString()}`;
}

function isRefinementResponse(payload: SearchResponse): payload is RefinementQuestionResponse {
    return "type" in payload && payload.type === "refinement_question";
}

function isResultsResponse(payload: SearchResponse): payload is SearchResultsResponse {
    return "data" in payload;
}

// MAIN COMPONENT
export default function SearchClientShell({
    initialQuery,
    imageSearch,
    initialResults,
    initialRefinementQuestion,
    initialError,
    searchId,
    debugSearch = false,
}: SearchClientShellProps) {
    console.warn(`[search-debug][${searchId}] SearchClientShell rendered with initialQuery="${initialQuery}", imageSearch=${imageSearch}, hasInitialResults=${Boolean(initialResults)}, hasInitialRefinementQuestion=${Boolean(initialRefinementQuestion)}, initialError=${initialError ? "yes" : "no"}`);
    const router = useRouter();

    const normalizedInitialResults = useMemo(() => normalizeSearchResults(initialResults), [initialResults]);
    const normalizedInitialRefinement = useMemo(
        () => normalizeRefinementQuestion(initialRefinementQuestion),
        [initialRefinementQuestion]
    );

    const [searchInput, setSearchInput] = useState(initialQuery);
    const [activeQuery, setActiveQuery] = useState(initialQuery);
    const [activeResults, setActiveResults] = useState<ClientSearchResults | null>(normalizedInitialResults);
    const [activeRefinement, setActiveRefinement] = useState<ShellRefinementQuestion | null>(normalizedInitialRefinement);
    const [activeError, setActiveError] = useState<string | null>(initialError);
    const [activeSearchState, setActiveSearchState] = useState<SearchState | null>(
        getRefinementSearchState(normalizedInitialRefinement)
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSearchInput(initialQuery);
        setActiveQuery(initialQuery);
        setActiveResults(normalizedInitialResults);
        setActiveRefinement(normalizedInitialRefinement);
        setActiveError(initialError);
        setActiveSearchState(getRefinementSearchState(normalizedInitialRefinement));
        setLoading(false);
    }, [initialQuery, normalizedInitialResults, normalizedInitialRefinement, initialError]);

    const effectiveResults = activeResults;
    const effectiveRefinement = activeRefinement;
    const effectiveError = activeError;
    const query = activeQuery || "";
    const internalResults = effectiveResults?.internalResults ?? [];
    const externalResults = effectiveResults?.externalResults ?? [];
    const totalCount = internalResults.length + externalResults.length;
    const hasResults = totalCount > 0;

    const statusText = loading
        ? "Searching across marketplaces..."
        : effectiveRefinement
            ? "Narrow down your search — pick an option below"
            : effectiveResults
                ? `Found ${totalCount} results`
                : "No results found";

    const popularSearchTerms = useMemo(() => {
        if (!query) return [];
        return getPopularSearches(6)
            .map((item) => item.query)
            .filter((term) => term.toLowerCase() !== query.toLowerCase())
            .slice(0, 4);
    }, [query]);

    const searchHref = (term: string) =>
        `/search?query=${encodeURIComponent(term)}${debugSearch ? "&debugSearch=1" : ""}`;

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        const q = searchInput.trim();
        if (!q) return;
        router.push(searchHref(q));
    };

    const handleRefinementOption = async (option: string) => {
        if (!effectiveRefinement) return;

        const value = optionToValue(effectiveRefinement.field, option);
        const refinementSearchState =
            getRefinementSearchState(effectiveRefinement) ?? activeSearchState;
        const rawQuery = refinementSearchState?.rawQuery?.trim() || query || initialQuery;
        if (!rawQuery) return;

        const params = new URLSearchParams();
        params.set("q", rawQuery);
        params.set("source", "both");
        params.set("provider", "auto");
        params.set("conversational", "1");
        params.set("lastUserMessage", rawQuery);
        params.set("refinementField", effectiveRefinement.field);
        params.set("refinementValue", value);

        if (debugSearch) {
            params.set("debugSearch", "1");
        }

        if (refinementSearchState) {
            params.set("searchState", JSON.stringify(refinementSearchState));
        }

        setLoading(true);
        setActiveError(null);

        try {
            const response = await fetch(`/api/search?${params.toString()}`, {
                method: "GET",
                cache: "no-store",
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload) {
                const errorMessage =
                    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
                        ? payload.error
                        : "Search failed.";
                throw new Error(errorMessage);
            }

            const searchPayload = payload as SearchResponse;

            if (isRefinementResponse(searchPayload)) {
                const nextSearchState = normalizeSearchState(searchPayload.searchState);
                const nextQuery =
                    nextSearchState.queryRewrite?.trim() ||
                    nextSearchState.rawQuery?.trim() ||
                    query;

                const nextRefinement = normalizeRefinementQuestion({
                    field: searchPayload.field,
                    question: searchPayload.question,
                    options: searchPayload.options,
                    searchState: nextSearchState,
                    turn: searchPayload.turn,
                    maxTurns: searchPayload.maxTurns,
                    vertical: searchPayload.vertical,
                    reason: searchPayload.reason,
                });

                setActiveQuery(nextQuery);
                setSearchInput(nextQuery);
                setActiveResults(null);
                setActiveRefinement(nextRefinement);
                setActiveSearchState(nextSearchState);

                window.history.replaceState(
                    {},
                    "",
                    buildSearchPageUrl({
                        query: nextQuery,
                        searchState: nextSearchState,
                        debugSearch,
                        imageSearch,
                    })
                );

                return;
            }

            if (!isResultsResponse(searchPayload)) {
                throw new Error("Unexpected search response shape.");
            }

            const nextSearchState = searchPayload.data.searchState
                ? normalizeSearchState(searchPayload.data.searchState)
                : refinementSearchState;
            const nextQuery =
                (typeof searchPayload.data.query === "string" && searchPayload.data.query.trim()) ||
                nextSearchState?.queryRewrite?.trim() ||
                nextSearchState?.rawQuery?.trim() ||
                query;

            setActiveQuery(nextQuery);
            setSearchInput(nextQuery);
            setActiveResults(
                normalizeSearchResults({
                    summary: searchPayload.data.summary ?? null,
                    internalResults: searchPayload.data.internalResults ?? [],
                    externalResults: searchPayload.data.externalResults ?? [],
                })
            );
            setActiveRefinement(null);
            setActiveSearchState(nextSearchState ?? null);

            window.history.replaceState(
                {},
                "",
                buildSearchPageUrl({
                    query: nextQuery,
                    searchState: nextSearchState,
                    debugSearch,
                    imageSearch,
                })
            );
        } catch (error) {
            setActiveError(error instanceof Error ? error.message : "Search failed.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!debugSearch) return;
        console.warn(`[search-debug][${searchId}] client-shell.mounted`, {
            initialQuery,
            imageSearch,
            hasInitialResults: Boolean(initialResults),
            hasInitialRefinementQuestion: Boolean(initialRefinementQuestion),
            initialError,
        });
    }, [debugSearch, searchId, initialQuery, imageSearch, initialResults, initialRefinementQuestion, initialError]);

    useEffect(() => {
        if (!debugSearch) return;
        console.warn(`[search-debug][${searchId}] client-shell.state`, {
            query,
            loading,
            hasError: Boolean(effectiveError),
            hasRefinement: Boolean(effectiveRefinement),
            internalCount: internalResults.length,
            externalCount: externalResults.length,
        });
    }, [
        debugSearch,
        searchId,
        query,
        loading,
        effectiveError,
        effectiveRefinement,
        internalResults.length,
        externalResults.length,
    ]);

    return (
        <>
            {/* Persistent Search Bar */}
            <div className="sticky top-0 z-40 bg-dark-950/95 backdrop-blur-lg border-b border-dark-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="hidden sm:block p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Back to Home"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </Link>

                        <form onSubmit={handleSearch} className="flex-1">
                            <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden hover:border-accent-500/50 transition-all">
                                <div className="pl-3 sm:pl-4">
                                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search for products..."
                                    className="flex-1 bg-transparent text-white placeholder-white/60 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base outline-none"
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={!searchInput.trim()}
                                    className="m-1.5 sm:m-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm sm:text-base font-semibold rounded-lg transition-all"
                                >
                                    Search
                                </button>
                            </div>
                        </form>

                        <Link
                            href="/"
                            className="hidden sm:block p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Home"
                        >
                            <Home className="w-5 h-5 text-gray-400" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Search Header */}
            <div className="relative py-6 border-b border-dark-700/50">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto text-center">
                        {imageSearch && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-accent-500/20 border border-accent-500/30 text-accent-300 text-sm">
                                <Camera className="w-4 h-4" />
                                Searched by image
                            </div>
                        )}
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            {query ? `Search Results for "${query}"` : "Search Results"}
                        </h1>
                        <p className="text-gray-400">{statusText}</p>
                        {debugSearch && (
                            <p className="mt-2 text-xs text-amber-300">
                                Debug Trace: <span className="font-mono">{searchId}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* AI refinement */}
            {!loading && query && effectiveRefinement && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageCircle className="w-5 h-5 text-accent-400" />
                            <span className="text-sm font-medium text-accent-300">AI assistant</span>
                        </div>
                        <p className="text-lg font-semibold text-white mb-4">{effectiveRefinement.question}</p>
                        <div className="flex flex-wrap gap-3">
                            {effectiveRefinement.options.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleRefinementOption(option)}
                                    className="px-5 py-2.5 bg-white/10 hover:bg-accent-500/20 border border-white/20 hover:border-accent-500/50 rounded-xl text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {effectiveError && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg font-semibold text-red-400 mb-1">Search Error</h3>
                            <p className="text-red-300">{effectiveError}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && !effectiveError && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <LoadingSpinner size="lg" text="Searching across the web..." />
                </div>
            )}

            {/* Results */}
            {!loading && !effectiveError && effectiveResults && (
                <>
                    {hasResults && (
                        <AISummarySection summary={effectiveResults.summary} query={query} hasResults={hasResults} />
                    )}

                    {internalResults.length > 0 && (
                        <div>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                                <h2 className="text-2xl font-bold text-white mb-2">AllVerse GPT Marketplace</h2>
                                <p className="text-gray-400">From our community</p>
                            </div>
                            <InternalResultsSection results={internalResults} />
                        </div>
                    )}

                    {externalResults.length > 0 && (
                        <div>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                                <h2 className="text-2xl font-bold text-white mb-2">From Other Marketplaces</h2>
                                <p className="text-gray-400">Showing results from Amazon, eBay, Walmart, and more</p>
                            </div>
                            <ExternalResultsSection results={externalResults} />
                        </div>
                    )}

                    {hasResults && popularSearchTerms.length > 0 && (
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                            <p className="text-sm text-gray-400 mb-2">Others also searched for</p>
                            <div className="flex flex-wrap gap-2">
                                {popularSearchTerms.map((term) => (
                                    <Link
                                        key={term}
                                        href={searchHref(term)}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-sm transition-colors"
                                    >
                                        {term}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {!hasResults && (
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-2xl font-bold text-white mb-2">No results found</h3>
                                <p className="text-gray-400 mb-6">
                                    Try searching with different keywords or browse our marketplace
                                </p>
                                <button
                                    onClick={() => router.push("/listings")}
                                    className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl transition-colors"
                                >
                                    Browse All Listings
                                </button>
                            </div>
                        </div>
                    )}

                    <SellCTASection />
                </>
            )}
        </>
    );
}
