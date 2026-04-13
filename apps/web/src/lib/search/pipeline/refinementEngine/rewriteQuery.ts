import { GeminiService } from "@/lib/gemini";
import type { SearchResults, SearchState, SearchVertical } from "../../types";

function normalizeToken(value: string): string {
    return value.trim().toLowerCase();
}

function tokenize(value: string): string[] {
    return value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
}

function pushIfPresent(parts: string[], value?: string | null) {
    if (!value || !value.trim()) return;
    parts.push(value.trim());
}

export function buildDeterministicRewrite(args: {
    query: string;
    state: SearchState;
    vertical: SearchVertical;
}): string {
    const prioritizedAttributeKeys = [
        "part_type",
        "engine_model",
        "phone_focus",
        "camera_use",
        "usage_profile",
        "dress_shoe_style",
        "shoe_type",
        "sofa_style",
        "bike_type",
        "size",
        "make",
        "year_range",
    ];
    const parts: string[] = [];
    for (const key of prioritizedAttributeKeys) {
        pushIfPresent(parts, args.state.attributes?.[key]);
    }
    pushIfPresent(parts, args.state.priceIntent);
    pushIfPresent(parts, args.state.condition);
    pushIfPresent(parts, args.state.brand?.[0]);
    pushIfPresent(parts, args.state.model ?? args.state.attributes?.model);

    for (const [key, value] of Object.entries(args.state.attributes ?? {})) {
        if (key === "model" || prioritizedAttributeKeys.includes(key)) continue;
        pushIfPresent(parts, value);
    }

    pushIfPresent(parts, args.state.category);
    pushIfPresent(parts, args.query);

    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const part of parts) {
        const key = normalizeToken(part);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(part);
    }

    return deduped.join(" ").trim() || args.query;
}

function scoreCandidate(candidate: string, results: SearchResults): number {
    const candidateTokens = tokenize(candidate);
    if (candidateTokens.length === 0) return 0;

    const corpus = [
        ...results.internalResults.slice(0, 12).map((result) => `${result.title} ${result.description}`),
        ...results.externalResults.slice(0, 12).map((result) => `${result.title} ${result.snippet ?? ""}`),
    ].join(" ");

    const corpusTokens = new Set(tokenize(corpus));
    const hits = candidateTokens.reduce((acc, token) => (corpusTokens.has(token) ? acc + 1 : acc), 0);

    return hits / candidateTokens.length;
}

function parseRewriteCandidates(raw: string): string[] {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    try {
        const parsed = JSON.parse(cleaned) as { rewrites?: string[] };
        if (Array.isArray(parsed?.rewrites)) {
            return parsed.rewrites
                .filter((entry): entry is string => typeof entry === "string")
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0)
                .slice(0, 5);
        }
        return [];
    } catch {
        return [];
    }
}

async function generateRewriteCandidatesWithLlm(args: {
    originalQuery: string;
    deterministicRewrite: string;
    state: SearchState;
    vertical: SearchVertical;
}): Promise<string[]> {
    const prompt = `
You improve marketplace search queries for better retrieval.
Return strict JSON only:
{"rewrites":["...", "...", "..."]}

Rules:
- Keep each rewrite under 10 words.
- Keep product-critical terms unchanged where possible.
- Include fitment/model terms when present.
- No duplicates.

Vertical: ${args.vertical}
Original query: ${args.originalQuery}
Deterministic rewrite: ${args.deterministicRewrite}
State: ${JSON.stringify(args.state)}
`;

    const response = await GeminiService.generateResponse(prompt, { model: "FAST" });
    if (!response.success) return [];
    return parseRewriteCandidates(response.message);
}

export async function rewriteQuery(args: {
    query: string;
    state: SearchState;
    vertical: SearchVertical;
    results: SearchResults;
    allowLlmRewrite: boolean;
    gatedLlmBudgetRemaining: number;
}): Promise<{ rewrittenQuery: string; rewriteUsed: boolean; llmUsed: boolean }> {
    const deterministic = buildDeterministicRewrite({
        query: args.query,
        state: args.state,
        vertical: args.vertical,
    });

    let candidates: string[] = [deterministic];
    let llmUsed = false;

    if (args.allowLlmRewrite && args.gatedLlmBudgetRemaining > 0) {
        const llmCandidates = await generateRewriteCandidatesWithLlm({
            originalQuery: args.query,
            deterministicRewrite: deterministic,
            state: args.state,
            vertical: args.vertical,
        });

        if (llmCandidates.length > 0) {
            llmUsed = true;
            candidates = [deterministic, ...llmCandidates];
        }
    }

    const best = candidates
        .map((candidate) => ({ candidate, score: scoreCandidate(candidate, args.results) }))
        .sort((a, b) => b.score - a.score)[0];

    const rewrittenQuery = best?.candidate?.trim() || deterministic;
    return {
        rewrittenQuery,
        rewriteUsed: normalizeToken(rewrittenQuery) !== normalizeToken(args.query),
        llmUsed,
    };
}
