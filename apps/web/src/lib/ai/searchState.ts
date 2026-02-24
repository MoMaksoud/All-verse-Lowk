export type SearchState = {
  rawQuery?: string;
  category?: string;
  priceIntent?: "cheap" | "mid" | "premium";
  condition?: "new" | "used";
  brand?: string[];
  attributes?: Record<string, string>;
};

export function mergeSearchState(prev: SearchState, next: Partial<SearchState>): SearchState {
  return { ...prev, ...next };
}
