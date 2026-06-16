import type { ExternalResult } from "../types";

const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "case",
    "for",
    "in",
    "of",
    "on",
    "the",
    "to",
    "with",
]);

const SOURCE_BONUS: Record<string, number> = {
    amazon: 0.45,
    "best buy": 0.4,
    target: 0.35,
    walmart: 0.35,
    apple: 0.35,
    ebay: 0.25,
};

function tokenize(value: string): string[] {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function sourceBonus(source: string): number {
    const normalized = source.toLowerCase();
    for (const [name, bonus] of Object.entries(SOURCE_BONUS)) {
        if (normalized.includes(name)) return bonus;
    }
    return 0;
}

function resultScore(result: ExternalResult, queryTokens: string[], rawQuery: string): number {
    const title = result.title.toLowerCase();
    const matchedTokens = queryTokens.filter((token) => title.includes(token)).length;
    const relevance = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;
    const phraseMatch = title.includes(rawQuery.toLowerCase()) ? 0.8 : 0;

    const rating = typeof result.rating === "number" && Number.isFinite(result.rating) ? result.rating : 0;
    const reviews = typeof result.reviewsCount === "number" && Number.isFinite(result.reviewsCount)
        ? Math.max(0, result.reviewsCount)
        : 0;
    const popularity = rating > 0 ? Math.max(0, rating - 3) * 0.9 + Math.log10(reviews + 1) * 0.55 : 0;
    const completeness = (result.price > 0 ? 0.45 : 0) + (result.image ? 0.35 : 0);

    return relevance * 4 + phraseMatch + popularity + completeness + sourceBonus(result.source);
}

function normalizeSource(source: string): string {
    return source.toLowerCase().replace(/\s+/g, " ").trim();
}

function diversifySources<T extends { result: ExternalResult }>(items: T[]): T[] {
    const remaining = [...items];
    const ranked: T[] = [];
    const maxConsecutiveFromSource = 2;

    while (remaining.length > 0) {
        const previousSource = ranked.length > 0 ? normalizeSource(ranked[ranked.length - 1].result.source) : "";
        const consecutiveCount = previousSource
            ? ranked.slice(-maxConsecutiveFromSource).filter((item) => normalizeSource(item.result.source) === previousSource).length
            : 0;

        const nextIndex = consecutiveCount >= maxConsecutiveFromSource
            ? remaining.findIndex((item) => normalizeSource(item.result.source) !== previousSource)
            : 0;

        const index = nextIndex >= 0 ? nextIndex : 0;
        ranked.push(remaining[index]);
        remaining.splice(index, 1);
    }

    return ranked;
}

export function rankExternalResults(results: ExternalResult[], query: string): ExternalResult[] {
    const queryTokens = tokenize(query);

    const scored = [...results]
        .map((result, index) => ({
            result,
            index,
            score: resultScore(result, queryTokens, query.trim()),
        }))
        .sort((a, b) => b.score - a.score || a.index - b.index);

    return diversifySources(scored)
        .map((item) => item.result);
}
