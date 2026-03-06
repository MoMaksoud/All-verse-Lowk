export type SearchSource = "internal" | "external" | "both";
export type ExternalProvider = "shopping" | "organic" | "auto";

export type SearchIntent = "shopping" | "info";
export type Condition = "new" | "used";
export type PriceIntent = "cheap" | "mid" | "premium";

export type SearchState = {
    rawQuery?: string;
    category?: string;
    brand?: string[];
    model?: string;
    condition?: Condition;
    priceIntent?: PriceIntent;
    attributes?: Record<string, string>;
    intent?: SearchIntent;
    vertical?: SearchVertical;
    refinementTurn?: number;
    lastRefinementField?: SearchRefinementField;
    queryRewrite?: string;
};

export type SearchRefinementField =
    | "brand"
    | "model"
    | "category"
    | "condition"
    | "priceIntent"
    | "intent"
    | (string & {});

export type SearchRequest = {
    query: string;
    provider: ExternalProvider;
    traceId: string;
    debug: boolean;
    source: SearchSource;
    limit: number;
    searchState?: SearchState;
    refinementField?: SearchRefinementField;
    refinementValue?: string;
    refinementTurn?: number;
    queryRewrite?: string;
    lastUserMessage?: string;
    conversationalMode?: boolean;
};

export type SearchSummary = {
    overview: string;
    priceRange?: {
        min: number;
        max: number;
        average: number;
    };
    topRecommendations?: string[];
    marketInsights?: string[];
};

export type InternalResult = {
    id: string;
    title: string;
    price: number;
    description: string;
    photos: string[];
    category: string;
    condition: string;
    sellerId: string;
    brand?: string;
    model?: string;
    isMatched?: boolean;
};

export type ExternalResult = {
    title: string;
    price: number;
    source: string;
    url: string;
    image?: string | null;
    snippet?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
};

export type SearchResults = {
    summary: SearchSummary | null;
    internalResults: InternalResult[];
    externalResults: ExternalResult[];
};

export type SearchMeta = {
    cacheHit: boolean;
    timingsMs: Record<string, number>;
    source: SearchSource;
    provider: ExternalProvider;
    limit: number;
    confidenceScore?: number;
    confidenceReasons?: ResultQualityReason[];
    vertical?: SearchVertical;
    refinementTriggered?: boolean;
    refinementTurn?: number;
    rewriteUsed?: boolean;
};

export type SearchResultsResponse = {
    traceId: string;
    meta: SearchMeta;
    data: {
        query: string;
        searchState?: SearchState;
        summary?: SearchSummary | null;
        internalResults: InternalResult[];
        externalResults: ExternalResult[];
    };
};

export type RefinementQuestion = {
    field: SearchRefinementField;
    question: string;
    options: string[];
    searchState?: SearchState;
    turn: number;
    maxTurns: number;
    vertical: SearchVertical;
    reason: string;
};

export type RefinementQuestionResponse = {
    traceId: string;
    meta: SearchMeta;
    type: "refinement_question";
    question: string;
    options: string[];
    field: SearchRefinementField;
    searchState: SearchState;
    turn: number;
    maxTurns: number;
    vertical: SearchVertical;
    reason: string;
};

export type SearchResponse = SearchResultsResponse | RefinementQuestionResponse;

export type ClientSearchResults = SearchResults;
export type ServerSearchResults = SearchResults;
export type ClientRefinementQuestion = RefinementQuestion;
export type ServerRefinementQuestion = RefinementQuestion;

export type ServerSearchResponse = {
    query: string;
    imageSearch: boolean;
    results: ServerSearchResults | null;
    refinementQuestion: ServerRefinementQuestion | null;
    error: string | null;
    searchId: string;
};

export type SearchVertical =
    | "auto_parts"
    | "vehicles"
    | "electronics"
    | "fashion"
    | "home"
    | "sports"
    | "other"
    | "general"
    | (string & {});

export type MissingSlot = {
    field: SearchRefinementField;
    reason?: string;
    suggestedQuestion?: string;
};

export type MissingImportantSlots = {
    vertical: SearchVertical;
    highValue: MissingSlot[];
    mediumValue: MissingSlot[];
    lowValue: MissingSlot[];
};

export type ResultQualityReason =
    | "no_results"
    | "too_few_results"
    | "weak_relevance"
    | "mixed_verticals"
    | "low_confidence"
    | "unknown";

export type ResultQuality = {
    bad: boolean;
    score: number;
    reasons: ResultQualityReason[];
    band: "bad" | "borderline" | "good";
    signals: {
        resultCountSignal: number;
        sourceAgreementSignal: number;
        slotCoverageSignal: number;
        queryMatchSignal: number;
        ambiguitySignal: number;
    };
};

export type InferVerticalFn = (query: string, state: SearchState) => SearchVertical;
export type GetMissingImportantSlotsFn = (
    vertical: SearchVertical,
    state: SearchState
) => MissingImportantSlots;
export type EvaluateResultsFn = (results: SearchResults) => ResultQuality;
export type ChooseNextQuestionFn = (
    vertical: SearchVertical,
    state: SearchState,
    results: SearchResults
) => RefinementQuestion | null;

export type ImageSearchExtractResponse = {
    traceId: string;
    extractedQuery: string;
    brand?: string;
    model?: string;
    category?: "electronics" | "fashion" | "home" | "sports" | "other";
};
