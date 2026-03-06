import type { RefinementEngineContext, RefinementDecision } from "./types";
import { inferVertical } from "./inferVertical";
import { getMissingImportantSlots } from "./getMissingImportantSlots";
import { evaluateResults } from "./evaluateResults";
import { chooseNextQuestion } from "./chooseNextQuestions";
import { rewriteQuery } from "./rewriteQuery";

export async function runRefinementEngine(
    ctx: RefinementEngineContext
): Promise<RefinementDecision> {
    const vertical = inferVertical(ctx.query, ctx.state);
    const stateWithVertical = { ...ctx.state, vertical };

    const missingSlots = getMissingImportantSlots(vertical, stateWithVertical);
    const resultQuality = evaluateResults({
        query: ctx.query,
        vertical,
        state: stateWithVertical,
        results: ctx.results,
    });

    const question = chooseNextQuestion({
        query: ctx.query,
        vertical,
        state: stateWithVertical,
        results: ctx.results,
        quality: resultQuality,
        missingSlots,
        maxTurns: ctx.maxTurns,
    });

    if (question) {
        return {
            action: "ask",
            question,
            state: {
                ...stateWithVertical,
                refinementTurn: stateWithVertical.refinementTurn ?? 0,
            },
            vertical,
            missingSlots,
            resultQuality,
            rewrittenQuery: ctx.query,
            rewriteUsed: false,
        };
    }

    const shouldRewrite =
        resultQuality.bad ||
        (resultQuality.band === "borderline" && missingSlots.highValue.length === 0);

    if (!shouldRewrite) {
        return {
            action: "search",
            question: null,
            state: stateWithVertical,
            vertical,
            missingSlots,
            resultQuality,
            rewrittenQuery: ctx.query,
            rewriteUsed: false,
        };
    }

    const rewrite = await rewriteQuery({
        query: ctx.query,
        state: stateWithVertical,
        vertical,
        results: ctx.results,
        allowLlmRewrite: ctx.allowLlmRewrite,
        gatedLlmBudgetRemaining: 1,
    });

    return {
        action: "search",
        question: null,
        state: {
            ...stateWithVertical,
            queryRewrite: rewrite.rewrittenQuery,
        },
        vertical,
        missingSlots,
        resultQuality,
        rewrittenQuery: rewrite.rewrittenQuery,
        rewriteUsed: rewrite.rewriteUsed,
    };
}

export { inferVertical } from "./inferVertical";
export { getMissingImportantSlots } from "./getMissingImportantSlots";
export { evaluateResults } from "./evaluateResults";
export { chooseNextQuestion } from "./chooseNextQuestions";
