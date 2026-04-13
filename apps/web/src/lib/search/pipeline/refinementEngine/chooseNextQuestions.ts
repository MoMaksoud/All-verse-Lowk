import type {
    MissingImportantSlots,
    RefinementQuestion,
    ResultQuality,
    SearchRefinementField,
    SearchResults,
    SearchState,
    SearchVertical,
} from "../../types";
import { getVerticalSchema } from "./verticalSchemas";
import type { SlotPriority, VerticalSlotConfig } from "./types";

function normalize(text: string): string {
    return text.trim().toLowerCase();
}

function capitalizePhrase(value: string): string {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
}

const GENERIC_QUERY_HINTS: Partial<Record<SearchVertical, string[]>> = {
    electronics: ["laptop", "notebook", "computer", "pc", "phone", "smartphone", "tablet", "camera", "monitor", "headphones"],
    fashion: ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "shirt", "dress", "jacket", "hoodie", "bag"],
    home: ["sofa", "couch", "sectional", "chair", "table", "bed", "mattress", "lamp", "appliance"],
    sports: ["bike", "bicycle", "golf", "tennis", "fitness"],
};

function tokenizeQuery(value: string): string[] {
    return value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
}

function readFieldValue(field: SearchRefinementField, state: SearchState): unknown {
    if (field === "brand") return state.brand;
    if (field === "model") return state.model ?? state.attributes?.model;
    if (field === "shoe_type") return state.attributes?.shoe_type ?? state.attributes?.dress_shoe_style;
    if (field === "category") return state.category;
    if (field === "condition") return state.condition;
    if (field === "priceIntent") return state.priceIntent;
    if (field === "intent") return state.intent;
    return state.attributes?.[field];
}

function isMissing(field: SearchRefinementField, state: SearchState): boolean {
    const value = readFieldValue(field, state);
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "string") return value.trim().length === 0;
    return false;
}

function extractCandidateEntities(results: SearchResults): string[] {
    const text = [
        ...results.internalResults.slice(0, 12).map((r) => `${r.title} ${r.description ?? ""}`),
        ...results.externalResults.slice(0, 12).map((r) => `${r.title} ${r.snippet ?? ""}`),
    ].join(" ");

    const candidatePattern = /\b([A-Z][a-zA-Z0-9-]*(?:\s+[A-Z0-9][a-zA-Z0-9-]*){0,2})\b/g;
    const map = new Map<string, number>();

    for (const match of text.matchAll(candidatePattern)) {
        const raw = match[1]?.trim();
        if (!raw) continue;
        const normalized = normalize(raw);
        if (normalized.length < 3 || normalized === "not sure") continue;
        const scoreBoost = /\d/.test(raw) ? 2 : 1;
        map.set(raw, (map.get(raw) ?? 0) + scoreBoost);
    }

    return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => value)
        .slice(0, 8);
}

function extractQueryEntities(query: string): string[] {
    const pattern = /\b([a-zA-Z]+(?:\s+[a-zA-Z0-9-]+){0,2})\b/g;
    const tokens = new Set<string>();
    for (const match of query.matchAll(pattern)) {
        const value = match[1]?.trim();
        if (!value || value.length < 3) continue;
        tokens.add(capitalizePhrase(value));
    }
    return Array.from(tokens).slice(0, 6);
}

function buildOptions(args: {
    field: SearchRefinementField;
    query: string;
    results: SearchResults;
    taxonomyOptions?: string[];
}): string[] {
    const options: string[] = [];
    const seen = new Set<string>();

    const pushIfValid = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        const key = normalize(trimmed);
        if (seen.has(key)) return;
        seen.add(key);
        options.push(trimmed);
    };

    for (const option of args.taxonomyOptions ?? []) pushIfValid(option);
    for (const option of extractCandidateEntities(args.results)) pushIfValid(option);
    for (const option of extractQueryEntities(args.query)) pushIfValid(option);

    const normalizedField = normalize(args.field);
    const filtered = options.filter((option) => {
        const normalized = normalize(option);
        if (normalizedField === "condition") return normalized === "new" || normalized === "used" || normalized === "not sure";
        if (normalizedField === "priceintent") return normalized === "cheap" || normalized === "mid" || normalized === "premium" || normalized === "not sure";
        return true;
    });

    const limited = filtered.slice(0, 5);
    if (!limited.some((option) => normalize(option) === "not sure")) {
        limited.push("Not sure");
    }

    return limited.slice(0, 6);
}

function priorityMatches(priority: SlotPriority, accepted: SlotPriority[]): boolean {
    return accepted.includes(priority);
}

function queryContainsAnyKeyword(query: string, keywords?: string[]): boolean {
    if (!keywords || keywords.length === 0) return true;
    const normalizedQuery = normalize(query);
    return keywords.some((keyword) => normalizedQuery.includes(normalize(keyword)));
}

function queryAlreadySatisfiesSlot(query: string, slot: VerticalSlotConfig): boolean {
    if (!slot.satisfiedByQueryKeywords || slot.satisfiedByQueryKeywords.length === 0) return false;
    const normalizedQuery = normalize(query);
    return slot.satisfiedByQueryKeywords.some((keyword) => normalizedQuery.includes(normalize(keyword)));
}

function isBroadQuery(
    query: string,
    vertical: SearchVertical
): boolean {
    const tokens = tokenizeQuery(query);
    if (tokens.length === 0 || tokens.length > 2) return false;

    const hints = GENERIC_QUERY_HINTS[vertical] ?? [];
    return tokens.some((token) => hints.includes(token));
}

function findFirstMissingSlot(args: {
    schemaSlots: VerticalSlotConfig[];
    state: SearchState;
    priorities: SlotPriority[];
    query?: string;
    requireBroadTrigger?: boolean;
    respectTriggerKeywords?: boolean;
    skipQuerySatisfied?: boolean;
}): VerticalSlotConfig | null {
    for (const slot of args.schemaSlots) {
        if (!priorityMatches(slot.priority, args.priorities)) continue;
        if (!isMissing(slot.field, args.state)) continue;
        if (args.respectTriggerKeywords && !queryContainsAnyKeyword(args.query ?? "", slot.triggerKeywords)) {
            continue;
        }
        if (args.skipQuerySatisfied && queryAlreadySatisfiesSlot(args.query ?? "", slot)) {
            continue;
        }
        if (args.requireBroadTrigger) {
            if (!slot.askOnBroadQuery) continue;
            if (!queryContainsAnyKeyword(args.query ?? "", slot.triggerKeywords)) continue;
            if (queryAlreadySatisfiesSlot(args.query ?? "", slot)) continue;
        }
        return slot;
    }

    return null;
}

function chooseCandidateSlot(
    query: string,
    schemaSlots: VerticalSlotConfig[],
    state: SearchState,
    vertical: SearchVertical,
    quality: ResultQuality
): VerticalSlotConfig | null {
    const broadQuery = isBroadQuery(query, vertical);

    if (broadQuery) {
        const exploratorySlot = findFirstMissingSlot({
            schemaSlots,
            state,
            priorities: ["required", "highValue"],
            query,
            requireBroadTrigger: true,
            respectTriggerKeywords: true,
            skipQuerySatisfied: true,
        });
        if (exploratorySlot) return exploratorySlot;

        const broadHighValueSlot = findFirstMissingSlot({
            schemaSlots,
            state,
            priorities: ["required", "highValue"],
            query,
            respectTriggerKeywords: true,
            skipQuerySatisfied: true,
        });
        if (broadHighValueSlot) return broadHighValueSlot;
    }

    if (quality.band !== "bad") return null;

    return (
        findFirstMissingSlot({
            schemaSlots,
            state,
            priorities: ["required", "highValue"],
            query,
            respectTriggerKeywords: true,
            skipQuerySatisfied: true,
        }) ??
        findFirstMissingSlot({
            schemaSlots,
            state,
            priorities: ["mediumValue"],
            query,
            respectTriggerKeywords: true,
            skipQuerySatisfied: true,
        })
    );
}

export function chooseNextQuestion(args: {
    query: string;
    vertical: SearchVertical;
    state: SearchState;
    results: SearchResults;
    quality: ResultQuality;
    missingSlots: MissingImportantSlots;
    maxTurns: number;
}): RefinementQuestion | null {
    const currentTurn = args.state.refinementTurn ?? 0;
    if (currentTurn >= args.maxTurns) return null;

    const schema = getVerticalSchema(args.vertical);
    const slotConfig = chooseCandidateSlot(
        args.query,
        schema.slots,
        args.state,
        args.vertical,
        args.quality
    );
    if (!slotConfig) return null;

    const options = buildOptions({
        field: slotConfig.field,
        query: args.query,
        results: args.results,
        taxonomyOptions: slotConfig.taxonomyOptions,
    });

    if (options.length < 2) return null;

    return {
        field: slotConfig.field,
        question: slotConfig.question,
        options,
        searchState: args.state,
        turn: currentTurn + 1,
        maxTurns: args.maxTurns,
        vertical: args.vertical,
        reason: slotConfig.reason,
    };
}
