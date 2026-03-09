import type { ExternalProvider, SearchState } from "../types";

type LegacyRefinementQuestion = {
    field: string;
    question: string;
    options: string[];
};

function setAttr(prev: SearchState, key: string, value: string | undefined): SearchState {
    const attrs = { ...(prev.attributes ?? {}) };
    if (!value) delete attrs[key];
    else attrs[key] = value;

    // if no attrs left, remove it
    const hasAny = Object.keys(attrs).length > 0;
    return { ...prev, attributes: hasAny ? attrs : undefined };
}

/**
 * Apply a single refinement into SearchState.
 */
export function applyRefinementToState(prev: SearchState, field: string, value: string): SearchState {
    const v = value.trim();

    const lc = v.toLowerCase();
    if (lc === "not sure" || lc === "both") {
        return prev;
    }

    if (field === "brand") return { ...prev, brand: v ? [v] : undefined };

    if (field === "model") {
        // model is stored under attributes
        return setAttr(prev, "model", v || undefined);
    }

    if (field === "category") return { ...prev, category: v.toLowerCase() || undefined };

    if (field === "condition") {
        const lc = v.toLowerCase();
        if (lc === "new" || lc === "used") return { ...prev, condition: lc };
        return prev;
    }

    if (field === "priceIntent") {
        const lc = v.toLowerCase();
        if (lc === "cheap" || lc === "mid" || lc === "premium") return { ...prev, priceIntent: lc };
        return prev;
    }

    // intent drives shopping vs organic when provider=auto
    if (field === "intent") {
        const lc = v.toLowerCase();
        if (lc === "shopping" || lc === "info") return { ...prev, intent: lc as SearchState["intent"] };
        return prev;
    }

    // fallback into attributes
    return setAttr(prev, field, v);
}

export function updateSearchState(
    baseState: SearchState,
    refinementField?: string,
    refinementValue?: string,
    rawQuery?: string
): SearchState {
    let state: SearchState = { ...baseState };
    if (rawQuery && !state.rawQuery) state.rawQuery = rawQuery;
    if (state.refinementTurn == null) state.refinementTurn = 0;

    if (refinementField && refinementValue) {
        state = applyRefinementToState(state, refinementField, refinementValue);
        state.refinementTurn = (baseState.refinementTurn ?? 0) + 1;
        state.lastRefinementField = refinementField;
    }

    return state;
}

// --- heuristics helpers ---
function isGenericQuery(q: string) {
    const tokens = q.trim().split(/\s+/).filter(Boolean);
    return tokens.length <= 3;
}

function looksLikeCarQuery(q: string) {
    // basic: year + make/model-ish
    const hasYear = /\b(19|20)\d{2}\b/.test(q);
    const carWords = ["toyota", "honda", "ford", "chevy", "bmw", "mercedes", "nissan", "hyundai", "kia"];
    const hasMake = carWords.some(w => q.toLowerCase().includes(w));
    return hasYear || hasMake;
}

function looksLikePartQuery(q: string) {
    const partWords = ["cylinder head", "alternator", "starter", "bumper", "grille", "headlight", "radiator", "brake", "engine"];
    const lower = q.toLowerCase();
    return partWords.some(w => lower.includes(w));
}

/**
 * Decide whether we should ask a question.
 * Keep it simple for now (no Gemini).
 *
 * NOTE: we do NOT ask "provider" directly; we ask "intent" (buy vs research).
 * Then provider=auto can switch between shopping/organic based on state.intent.
 */
export function decideRefinementQuestion(args: {
    query: string;
    state: SearchState;
    resultCount: number;
    provider: ExternalProvider;
}): LegacyRefinementQuestion | null {
    const { query, state, resultCount, provider } = args;

    const missingBrand = !state.brand || state.brand.length === 0;
    const missingModel = !state.attributes?.model;

    // 1) If provider=auto OR shopping and query is generic for cars/parts, ask brand/model
    if ((provider === "auto" || provider === "shopping") && isGenericQuery(query) && (looksLikeCarQuery(query) || looksLikePartQuery(query))) {
        if (missingBrand) {
            return {
                field: "brand",
                question: "What brand is it?",
                options: ["Toyota", "Honda", "Ford", "Chevrolet", "Not sure"],
            };
        }
        if (missingModel) {
            return {
                field: "model",
                question: "What model is it?",
                options: ["Corolla", "Civic", "F-150", "Camry", "Not sure"],
            };
        }
    }

    // 2) If results came back but they look like research flow (organic) and user might want to buy:
    // Ask intent, not provider
    if (resultCount > 0 && provider === "organic" && !state.intent) {
        return {
            field: "intent",
            question: "Are you trying to buy it, or just research it?",
            options: ["shopping", "info", "both"],
        };
    }

    // 3) If zero results and missing key details → ask for intent first (helps decide shopping vs organic)
    if (resultCount === 0 && !state.intent) {
        return {
            field: "intent",
            question: "Quick question: are you trying to buy this or just research it?",
            options: ["shopping", "info"],
        };
    }

    // 4) If buying intent but missing condition/priceIntent, ask those
    if (state.intent === "shopping") {
        if (!state.condition) {
            return {
                field: "condition",
                question: "Do you want new or used?",
                options: ["new", "used"],
            };
        }
        if (!state.priceIntent) {
            return {
                field: "priceIntent",
                question: "What price tier are you aiming for?",
                options: ["cheap", "mid", "premium"],
            };
        }
    }

    return null;
}
