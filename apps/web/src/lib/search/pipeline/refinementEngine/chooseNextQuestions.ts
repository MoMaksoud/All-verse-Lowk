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

function readFieldValue(field: SearchRefinementField, state: SearchState): unknown {
    if (field === "brand") return state.brand;
    if (field === "model") return state.model ?? state.attributes?.model;
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

function chooseCandidateField(
    state: SearchState,
    missingSlots: MissingImportantSlots,
    quality: ResultQuality
): SearchRefinementField | null {
    if (quality.band === "good") return null;

    if (missingSlots.highValue.length > 0) {
        const field = missingSlots.highValue.find((slot) => isMissing(slot.field, state))?.field;
        if (field) return field;
    }

    if (quality.bad && missingSlots.mediumValue.length > 0) {
        const field = missingSlots.mediumValue.find((slot) => isMissing(slot.field, state))?.field;
        if (field) return field;
    }

    return null;
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

    const field = chooseCandidateField(args.state, args.missingSlots, args.quality);
    if (!field) return null;

    const schema = getVerticalSchema(args.vertical);
    const slotConfig = schema.slots.find((slot) => slot.field === field);
    if (!slotConfig) return null;

    const options = buildOptions({
        field,
        query: args.query,
        results: args.results,
        taxonomyOptions: slotConfig.taxonomyOptions,
    });

    if (options.length < 2) return null;

    return {
        field,
        question: slotConfig.question,
        options,
        searchState: args.state,
        turn: currentTurn + 1,
        maxTurns: args.maxTurns,
        vertical: args.vertical,
        reason: slotConfig.reason,
    };
}
