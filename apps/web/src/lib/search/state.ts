import type { SearchState } from "./types";

function normalizeValue(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function normalizeAttributes(
    attributes?: Record<string, string>
): Record<string, string> | undefined {
    if (!attributes) return undefined;

    const entries = Object.entries(attributes).filter((entry): entry is [string, string] => {
        const [key, value] = entry;
        return key.trim().length > 0 && normalizeValue(value) !== undefined;
    });

    if (entries.length === 0) return undefined;

    return Object.fromEntries(
        entries.map(([key, value]) => [key, normalizeValue(value)!])
    );
}

export function getSearchStateModel(
    state?: Pick<SearchState, "model" | "attributes">
): string | undefined {
    return normalizeValue(state?.model) ?? normalizeValue(state?.attributes?.model);
}

export function setSearchStateModel(
    state: SearchState,
    model: string | undefined
): SearchState {
    const nextAttributes = { ...(normalizeAttributes(state.attributes) ?? {}) };
    delete nextAttributes.model;

    const normalizedModel = normalizeValue(model);
    const hasAttributes = Object.keys(nextAttributes).length > 0;

    return {
        ...state,
        model: normalizedModel,
        attributes: hasAttributes ? nextAttributes : undefined,
    };
}

export function normalizeSearchState(state: SearchState): SearchState {
    const normalized = setSearchStateModel(state, getSearchStateModel(state));
    const normalizedBrand = normalized.brand
        ?.map((value) => normalizeValue(value))
        .filter((value): value is string => Boolean(value));

    return {
        ...normalized,
        rawQuery: normalizeValue(normalized.rawQuery),
        category: normalizeValue(normalized.category)?.toLowerCase(),
        brand: normalizedBrand && normalizedBrand.length > 0 ? normalizedBrand : undefined,
        queryRewrite: normalizeValue(normalized.queryRewrite),
    };
}
