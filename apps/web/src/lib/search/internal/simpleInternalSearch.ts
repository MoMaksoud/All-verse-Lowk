import type { InternalResult, SearchState } from "../types";
import { getAdminDb } from "./firestoreAdmin";

const STOP_WORDS = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "these",
    "those",
    "a",
    "an",
    "to",
    "of",
    "on",
    "in",
    "at",
    "by",
    "is",
    "are",
    "it",
    "or",
]);

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenize(q: string): string[] {
    return q
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function hasToken(text: string, token: string): boolean {
    return new RegExp(`\\b${escapeRegex(token)}\\b`, "i").test(text);
}

export async function simpleInternalSearch(args: {
    query: string;
    limit: number;
    debug?: boolean;
    searchState?: SearchState;
}): Promise<{ results: InternalResult[]; fetched: number; sample?: any }> {
    const db = getAdminDb();

    const snap = await db
        .collection("listings")
        .where("isActive", "==", true)
        .limit(200)
        .get();

    if (snap.empty) return { results: [], fetched: 0 };

    const sampleDoc = snap.docs[0];
    const sampleData = sampleDoc?.data();

    const tokens = tokenize(args.query);
    const normalizedQuery = args.query.trim().toLowerCase();
    const normalizedStateBrand = args.searchState?.brand?.[0]?.trim().toLowerCase();
    const normalizedStateModel = (
        args.searchState?.model ??
        args.searchState?.attributes?.model ??
        args.searchState?.attributes?.engine_model
    )?.trim().toLowerCase();
    const normalizedStateCategory = args.searchState?.category?.trim().toLowerCase();
    const normalizedStateCondition = args.searchState?.condition?.trim().toLowerCase();

    const all = snap.docs.map((doc) => {
        const d: any = doc.data();
        const item: InternalResult = {
            id: doc.id,
            title: d.title ?? "",
            price: Number(d.price) || 0,
            description: d.description ?? "",
            photos: d.images ?? [],
            category: d.category ?? "",
            condition: d.condition ?? "",
            sellerId: d.sellerId ?? "",
            brand: d.brand ?? undefined,
            model: d.model ?? undefined,
        };

        return {
            item,
            rawSearchKeywords: Array.isArray(d.searchKeywords)
                ? d.searchKeywords.filter((value: unknown): value is string => typeof value === "string")
                : [],
        };
    });

    const scored = all.map(({ item, rawSearchKeywords }) => {
        const title = item.title.toLowerCase();
        const description = item.description.toLowerCase();
        const category = item.category.toLowerCase();
        const brand = (item.brand ?? "").toLowerCase();
        const model = (item.model ?? "").toLowerCase();
        const keywordsText = rawSearchKeywords.join(" ").toLowerCase();
        const fullText = `${title} ${description} ${category} ${brand} ${model} ${keywordsText}`;

        let score = 0;
        let tokenMatches = 0;

        if (normalizedQuery.length >= 4 && (title.includes(normalizedQuery) || description.includes(normalizedQuery))) {
            score += 5;
        }

        for (const token of tokens) {
            let matched = false;
            if (hasToken(title, token)) {
                score += 2.4;
                matched = true;
            }
            if (hasToken(brand, token) || hasToken(model, token)) {
                score += 2.1;
                matched = true;
            }
            if (hasToken(category, token)) {
                score += 1.2;
                matched = true;
            }
            if (hasToken(keywordsText, token)) {
                score += 1.6;
                matched = true;
            }
            if (hasToken(description, token)) {
                score += 0.7;
                matched = true;
            }
            if (matched) tokenMatches += 1;
        }

        if (normalizedStateBrand) {
            if (brand.includes(normalizedStateBrand) || title.includes(normalizedStateBrand)) {
                score += 3;
            } else {
                score -= 2.5;
            }
        }

        if (normalizedStateModel) {
            if (model.includes(normalizedStateModel) || title.includes(normalizedStateModel) || description.includes(normalizedStateModel)) {
                score += 3.4;
            } else {
                score -= 2.8;
            }
        }

        if (normalizedStateCategory) {
            if (category.includes(normalizedStateCategory)) {
                score += 1.5;
            } else {
                score -= 1.2;
            }
        }

        if (normalizedStateCondition) {
            const itemCondition = item.condition.toLowerCase();
            const isNewLike = itemCondition.includes("new");
            const conditionMatches =
                normalizedStateCondition === "new" ? isNewLike : !isNewLike;

            if (conditionMatches) score += 0.8;
            else score -= 0.5;
        }

        return {
            item,
            score,
            tokenMatches,
            strictMatch: score >= 2.5 && (tokens.length === 0 || tokenMatches >= Math.min(2, Math.max(1, Math.ceil(tokens.length * 0.4)))),
        };
    });

    const strictResults = scored
        .filter((x) => x.strictMatch)
        .sort((a, b) => b.score - a.score)
        .slice(0, args.limit)
        .map((x) => x.item);

    const fallbackResults = scored
        .filter((x) => x.score > 0 && (tokens.length === 0 || x.tokenMatches >= 1))
        .sort((a, b) => b.score - a.score)
        .slice(0, args.limit)
        .map((x) => x.item);

    const filtered = strictResults.length > 0 ? strictResults : fallbackResults;

    return {
        results: filtered,
        fetched: snap.size,
        sample: args.debug
            ? {
                id: sampleDoc.id,
                keys: Object.keys(sampleData ?? {}),
                strictCount: strictResults.length,
                fallbackCount: fallbackResults.length,
            }
            : undefined,
    };
}
