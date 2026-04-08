import type {
    MissingImportantSlots,
    RefinementQuestion,
    ResultQuality,
    SearchRefinementField,
    SearchResults,
    SearchState,
    SearchVertical,
} from "../../types";

export type SlotPriority = "required" | "highValue" | "mediumValue" | "lowValue";
export type OptionGenerationStrategy = "taxonomy" | "result_entities" | "query_entities" | "mixed";

export type VerticalSlotConfig = {
    field: SearchRefinementField;
    question: string;
    reason: string;
    priority: SlotPriority;
    optionGeneration: OptionGenerationStrategy;
    taxonomyOptions?: string[];
    askOnBroadQuery?: boolean;
    triggerKeywords?: string[];
    satisfiedByQueryKeywords?: string[];
};

export type VerticalSchema = {
    vertical: SearchVertical;
    keywords: string[];
    slots: VerticalSlotConfig[];
};

export type ResultCorpus = {
    query: string;
    results: SearchResults;
    state: SearchState;
    vertical: SearchVertical;
};

export type RefinementEngineContext = ResultCorpus & {
    maxTurns: number;
    allowLlmRewrite: boolean;
    debug?: boolean;
    traceId: string;
};

export type RefinementDecision =
    | {
        action: "ask";
        question: RefinementQuestion;
        state: SearchState;
        vertical: SearchVertical;
        missingSlots: MissingImportantSlots;
        resultQuality: ResultQuality;
        rewrittenQuery: string;
        rewriteUsed: boolean;
    }
    | {
        action: "search";
        question: null;
        state: SearchState;
        vertical: SearchVertical;
        missingSlots: MissingImportantSlots;
        resultQuality: ResultQuality;
        rewrittenQuery: string;
        rewriteUsed: boolean;
    };
