"use client";

import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Search, ArrowLeft, Camera, MessageCircle, SearchX } from "lucide-react";

import { AISummarySection } from "@/components/search/AISummarySection";
import { ExternalResultsSection } from "@/components/search/ExternalResultsSection";
import { InternalResultsSection } from "@/components/search/InternalResultsSection";
import { SellCTASection } from "@/components/search/SellCTASection";
import { ListingCardSkeleton } from "@/components/ListingCard";

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
            {/* Persistent search bar */}
            <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-lg">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 sm:grid"
                        aria-label="Back to home"
                    >
                        <ArrowLeft strokeWidth={1.75} className="h-5 w-5" />
                    </Link>
                    <form onSubmit={handleSearch} className="flex-1" role="search">
                        <div className="flex items-center rounded-xl border border-zinc-300 bg-white p-1 transition focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10">
                            <Search aria-hidden strokeWidth={1.75} className="ml-3 h-4 w-4 shrink-0 text-zinc-400" />
                            <label htmlFor="search-input" className="sr-only">Search</label>
                            <input
                                id="search-input"
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search for anything"
                                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 sm:text-base"
                                autoComplete="off"
                            />
                            <button
                                type="submit"
                                disabled={!searchInput.trim()}
                                className="h-9 shrink-0 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-primary-600/50"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="mx-auto max-w-7xl space-y-14 px-4 pb-20 pt-8 sm:px-6 md:pt-12 lg:px-8">
                <header>
                    {imageSearch && (
                        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary-700">
                            <Camera strokeWidth={1.75} className="h-4 w-4" />
                            Searched by image
                        </p>
                    )}
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                        {query ? <>Results for <span className="text-primary-600">“{query}”</span></> : 'Search results'}
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500">{statusText}</p>
                    {debugSearch && (
                        <p className="mt-2 text-xs text-amber-700">
                            Debug trace: <span className="font-mono">{searchId}</span>
                        </p>
                    )}
                </header>

                {/* AI refinement */}
                {!loading && query && effectiveRefinement && (
                    <section className="rounded-2xl border border-zinc-200 p-5 sm:p-7">
                        <p className="flex items-center gap-2 text-sm font-medium text-primary-700">
                            <MessageCircle strokeWidth={1.75} className="h-4 w-4" />
                            Help us narrow it down
                        </p>
                        <p className="mt-2 text-lg font-semibold text-zinc-950">{effectiveRefinement.question}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {effectiveRefinement.options.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleRefinementOption(option)}
                                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-primary-600 hover:text-primary-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Error */}
                {effectiveError && (
                    <div role="alert" className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5">
                        <AlertCircle strokeWidth={1.75} className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                        <div>
                            <p className="font-semibold text-red-800">Search didn&apos;t finish</p>
                            <p className="mt-1 text-sm text-red-700">{effectiveError}</p>
                            <button onClick={() => window.location.reload()} className="btn btn-outline mt-4 py-2">
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && !effectiveError && (
                    <div aria-live="polite" className="space-y-6">
                        <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
                            {Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
                        </div>
                    </div>
                )}

                {/* Results */}
                {!loading && !effectiveError && effectiveResults && (
                    <>
                        {hasResults && (
                            <AISummarySection summary={effectiveResults.summary} query={query} hasResults={hasResults} />
                        )}

                        {internalResults.length > 0 && (
                            <section>
                                <h2 className="mb-6 text-xl font-semibold tracking-tight text-zinc-950">
                                    On AllVerse <span className="font-normal text-zinc-400">{internalResults.length}</span>
                                </h2>
                                <InternalResultsSection results={internalResults} />
                            </section>
                        )}

                        {externalResults.length > 0 && (
                            <section>
                                <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                                    From other marketplaces <span className="font-normal text-zinc-400">{externalResults.length}</span>
                                </h2>
                                <p className="mb-6 mt-1 text-sm text-zinc-500">Opens the seller&apos;s site in a new tab.</p>
                                <ExternalResultsSection results={externalResults} />
                            </section>
                        )}

                        {hasResults && popularSearchTerms.length > 0 && (
                            <div className="border-t border-zinc-200 pt-8">
                                <p className="mb-3 text-sm font-medium text-zinc-950">Others also searched for</p>
                                <div className="flex flex-wrap gap-2">
                                    {popularSearchTerms.map((term) => (
                                        <Link
                                            key={term}
                                            href={searchHref(term)}
                                            className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-200 hover:text-zinc-950"
                                        >
                                            {term}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!hasResults && (
                            <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-zinc-300 px-6 py-10">
                                <SearchX strokeWidth={1.5} className="h-8 w-8 text-zinc-400" />
                                <div>
                                    <p className="font-medium text-zinc-950">Nothing found for “{query}”</p>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        Try fewer or different words, or browse the marketplace.
                                    </p>
                                </div>
                                <button onClick={() => router.push("/listings")} className="btn btn-outline py-2">
                                    Browse marketplace
                                </button>
                            </div>
                        )}

                        <SellCTASection />
                    </>
                )}
            </div>
        </>
    );
}
