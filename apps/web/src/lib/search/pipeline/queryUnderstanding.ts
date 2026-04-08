import type { SearchState } from "../types";
import { normalizeSearchState } from "../state";

type ProductFamilyRule = {
    key: string;
    brand: string;
    category: string;
    canonicalFamily: string;
    patterns: RegExp[];
};

type KnownBrand = {
    brand: string;
    patterns: RegExp[];
};

const KNOWN_BRANDS: KnownBrand[] = [
    { brand: "Apple", patterns: [/\bapple\b/i] },
    { brand: "Samsung", patterns: [/\bsamsung\b/i] },
    { brand: "Google", patterns: [/\bgoogle\b/i] },
    { brand: "Sony", patterns: [/\bsony\b/i] },
    { brand: "Dell", patterns: [/\bdell\b/i] },
    { brand: "HP", patterns: [/\bhp\b/i, /\bhewlett[-\s]?packard\b/i] },
    { brand: "Asus", patterns: [/\basus\b/i] },
    { brand: "Lenovo", patterns: [/\blenovo\b/i] },
    { brand: "Microsoft", patterns: [/\bmicrosoft\b/i] },
];

const PRODUCT_FAMILY_RULES: ProductFamilyRule[] = [
    {
        key: "apple_watch",
        brand: "Apple",
        category: "electronics",
        canonicalFamily: "apple watch",
        patterns: [/\bapple\s*watch\b/i, /\biwatch\b/i],
    },
    {
        key: "airpods",
        brand: "Apple",
        category: "electronics",
        canonicalFamily: "airpods",
        patterns: [/\bair\s*pods\b/i, /\bairpods\b/i, /\bearpods\b/i],
    },
    {
        key: "macbook",
        brand: "Apple",
        category: "electronics",
        canonicalFamily: "macbook",
        patterns: [/\bmac\s*book\b/i, /\bmacbook\b/i, /\bmacbok\b/i],
    },
    {
        key: "iphone",
        brand: "Apple",
        category: "electronics",
        canonicalFamily: "iphone",
        patterns: [/\biphone\b/i, /\biphon\b/i],
    },
    {
        key: "ipad",
        brand: "Apple",
        category: "electronics",
        canonicalFamily: "ipad",
        patterns: [/\bipad\b/i, /\bipadd\b/i],
    },
    {
        key: "galaxy",
        brand: "Samsung",
        category: "electronics",
        canonicalFamily: "galaxy",
        patterns: [/\bgalaxy\b/i, /\bgalaxi\b/i],
    },
    {
        key: "pixel",
        brand: "Google",
        category: "electronics",
        canonicalFamily: "pixel",
        patterns: [/\bpixel\b/i, /\bpixle\b/i],
    },
];

export type QueryUnderstandingResult = {
    state: SearchState;
    query: string;
    appliedRule?: string;
};

function normalizeText(value: string): string {
    return value.trim().toLowerCase();
}

function collapseWhitespace(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function detectExplicitBrand(query: string): string | undefined {
    for (const knownBrand of KNOWN_BRANDS) {
        if (knownBrand.patterns.some((pattern) => pattern.test(query))) {
            return knownBrand.brand;
        }
    }
    return undefined;
}

function buildCanonicalQuery(query: string, rule: ProductFamilyRule): string {
    const matchedPattern = rule.patterns.find((pattern) => pattern.test(query));
    if (!matchedPattern) return collapseWhitespace(query);

    let rewritten = query.replace(matchedPattern, rule.canonicalFamily);
    const normalizedBrand = normalizeText(rule.brand);
    const normalizedFamily = normalizeText(rule.canonicalFamily);

    if (
        !new RegExp(`\\b${normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(rewritten) &&
        !normalizedFamily.includes(normalizedBrand)
    ) {
        rewritten = `${rule.brand} ${rewritten}`;
    }

    return collapseWhitespace(rewritten);
}

export function applyDeterministicQueryUnderstanding(
    query: string,
    state: SearchState
): QueryUnderstandingResult {
    const normalizedState = normalizeSearchState(state);
    const baseQuery = collapseWhitespace(query);
    const explicitBrand = detectExplicitBrand(baseQuery);

    let nextState = normalizedState;
    let nextQuery = normalizedState.queryRewrite ?? baseQuery;
    let appliedRule: string | undefined;

    if (!nextState.brand?.length && explicitBrand) {
        nextState = {
            ...nextState,
            brand: [explicitBrand],
        };
    }

    for (const rule of PRODUCT_FAMILY_RULES) {
        if (!rule.patterns.some((pattern) => pattern.test(baseQuery))) {
            continue;
        }

        const lockedBrand = nextState.brand?.[0] ?? explicitBrand;
        if (lockedBrand && normalizeText(lockedBrand) !== normalizeText(rule.brand)) {
            continue;
        }

        if (!nextState.brand?.length) {
            nextState = {
                ...nextState,
                brand: [rule.brand],
            };
        }

        if (!nextState.category) {
            nextState = {
                ...nextState,
                category: rule.category,
            };
        }

        if (!nextState.queryRewrite) {
            const rewritten = buildCanonicalQuery(baseQuery, rule);
            if (normalizeText(rewritten) !== normalizeText(baseQuery)) {
                nextState = {
                    ...nextState,
                    queryRewrite: rewritten,
                };
                nextQuery = rewritten;
            }
        }

        appliedRule = rule.key;
        break;
    }

    return {
        state: normalizeSearchState(nextState),
        query: nextState.queryRewrite ?? nextQuery,
        appliedRule,
    };
}
