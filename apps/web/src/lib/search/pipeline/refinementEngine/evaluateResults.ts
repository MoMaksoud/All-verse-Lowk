import type {
    ResultQuality,
    ResultQualityReason,
    SearchResults,
    SearchState,
    SearchVertical,
} from "../../types";
import { getMissingImportantSlots } from "./getMissingImportantSlots";

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
}

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function countSignal(totalResults: number): number {
    if (totalResults <= 0) return 0;
    if (totalResults >= 12) return 1;
    return clamp(totalResults / 12);
}

function sourceAgreementSignal(results: SearchResults): number {
    if (results.internalResults.length === 0 || results.externalResults.length === 0) {
        return 0.35;
    }

    const internalTokens = new Set(
        tokenize(results.internalResults.slice(0, 8).map((r) => r.title).join(" "))
    );
    const externalTokens = new Set(
        tokenize(results.externalResults.slice(0, 8).map((r) => r.title).join(" "))
    );

    let overlap = 0;
    for (const token of internalTokens) {
        if (externalTokens.has(token)) overlap += 1;
    }

    const denominator = Math.max(1, Math.min(internalTokens.size, externalTokens.size));
    return clamp(overlap / denominator);
}

function queryMatchSignal(query: string, results: SearchResults): number {
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return 0.5;

    const topTitles = [
        ...results.internalResults.slice(0, 6).map((r) => r.title),
        ...results.externalResults.slice(0, 6).map((r) => r.title),
    ].join(" ");

    const resultTokens = new Set(tokenize(topTitles));
    const hits = qTokens.reduce((acc, token) => (resultTokens.has(token) ? acc + 1 : acc), 0);
    return clamp(hits / qTokens.length);
}

function ambiguitySignal(query: string): number {
    const tokens = tokenize(query);
    if (tokens.length <= 1) return 0;
    if (tokens.length === 2) return 0.25;
    if (tokens.length === 3) return 0.45;
    return 0.75;
}

function slotCoverageSignal(vertical: SearchVertical, state: SearchState): number {
    const missing = getMissingImportantSlots(vertical, state);
    const penalty =
        missing.highValue.length * 0.22 +
        missing.mediumValue.length * 0.1 +
        missing.lowValue.length * 0.05;
    return clamp(1 - penalty);
}

export function evaluateResults(args: {
    query: string;
    vertical: SearchVertical;
    state: SearchState;
    results: SearchResults;
}): ResultQuality {
    const totalResults = args.results.internalResults.length + args.results.externalResults.length;

    const resultCountSignal = countSignal(totalResults);
    const sourceAgreement = sourceAgreementSignal(args.results);
    const queryMatch = queryMatchSignal(args.query, args.results);
    const slotCoverage = slotCoverageSignal(args.vertical, args.state);
    const ambiguity = ambiguitySignal(args.query);

    const score = clamp(
        resultCountSignal * 0.28 +
        sourceAgreement * 0.2 +
        slotCoverage * 0.24 +
        queryMatch * 0.2 +
        ambiguity * 0.08
    );

    const reasons: ResultQualityReason[] = [];
    if (totalResults === 0) reasons.push("no_results");
    else if (totalResults < 3) reasons.push("too_few_results");

    if (queryMatch < 0.35) reasons.push("weak_relevance");
    if (sourceAgreement < 0.2 && args.results.internalResults.length > 0 && args.results.externalResults.length > 0) {
        reasons.push("mixed_verticals");
    }

    if (score < 0.65) reasons.push("low_confidence");
    if (reasons.length === 0) reasons.push("unknown");

    const band = score < 0.45 ? "bad" : score < 0.65 ? "borderline" : "good";

    return {
        bad: band === "bad",
        score,
        reasons,
        band,
        signals: {
            resultCountSignal,
            sourceAgreementSignal: sourceAgreement,
            slotCoverageSignal: slotCoverage,
            queryMatchSignal: queryMatch,
            ambiguitySignal: ambiguity,
        },
    };
}
