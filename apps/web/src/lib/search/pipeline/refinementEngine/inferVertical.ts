import type { SearchState, SearchVertical } from "../../types";
import { getAllVerticalSchemas } from "./verticalSchemas";

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

const CATEGORY_TO_VERTICAL: Record<string, SearchVertical> = {
    automotive: "auto_parts",
    auto: "auto_parts",
    auto_parts: "auto_parts",
    parts: "auto_parts",
    vehicles: "vehicles",
    cars: "vehicles",
    electronics: "electronics",
    fashion: "fashion",
    clothing: "fashion",
    home: "home",
    furniture: "home",
    sports: "sports",
};

export function inferVertical(query: string, state: SearchState): SearchVertical {
    if (state.vertical && state.vertical.trim()) {
        return state.vertical;
    }

    const normalizedCategory = normalize(state.category ?? "");
    if (normalizedCategory && CATEGORY_TO_VERTICAL[normalizedCategory]) {
        return CATEGORY_TO_VERTICAL[normalizedCategory];
    }

    const haystack = normalize(
        [
            query,
            state.rawQuery ?? "",
            state.category ?? "",
            state.brand?.join(" ") ?? "",
            state.model ?? "",
            Object.values(state.attributes ?? {}).join(" "),
        ].join(" ")
    );

    let best: SearchVertical = "general";
    let bestScore = 0;

    for (const schema of getAllVerticalSchemas()) {
        if (schema.keywords.length === 0) continue;
        const score = schema.keywords.reduce((acc, keyword) => {
            return haystack.includes(keyword.toLowerCase()) ? acc + 1 : acc;
        }, 0);

        if (score > bestScore) {
            best = schema.vertical;
            bestScore = score;
        }
    }

    return bestScore > 0 ? best : "general";
}
