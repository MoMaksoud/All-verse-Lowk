'use client';

import { useState, useCallback } from 'react';
import type { SearchState } from '@/lib/search/types';

export interface SearchResults {
  externalResults: Array<{
    title: string;
    price: number;
    source: string;
    url: string;
    image?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
  }>;
  internalResults: Array<{
    id: string;
    title: string;
    price: number;
    description: string;
    photos: string[];
    category: string;
    condition: string;
    sellerId: string;
  }>;
  summary: {
    overview: string;
    priceRange?: { min: number; max: number; average: number };
    topRecommendations?: string[];
    marketInsights?: string[];
  } | null;
}

export interface RefinementQuestion {
  question: string;
  options: string[];
  field: string;
  turn?: number;
  maxTurns?: number;
  vertical?: string;
  reason?: string;
}

type ApiResponse =
  | { type: 'refinement_question'; question: string; options: string[]; field: string; turn?: number; maxTurns?: number; vertical?: string; reason?: string; searchState?: SearchState }
  | { data: { internalResults: SearchResults['internalResults']; externalResults: SearchResults['externalResults']; summary?: SearchResults['summary'] } };

export function useConversationalSearch() {
  const [searchState, setSearchState] = useState<SearchState>({});
  const [results, setResults] = useState<SearchResults | null>(null);
  const [refinementQuestion, setRefinementQuestion] = useState<RefinementQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (state: SearchState, refinementField?: string, refinementValue?: string) => {
    const query = state.rawQuery || '';
    if (!query.trim()) {
      setError('Query is required');
      return;
    }
    setError(null);
    setLoading(true);
    setRefinementQuestion(null);

    const params = new URLSearchParams();
    params.set('q', query);
    params.set('searchState', JSON.stringify(state));
    params.set('source', 'both');
    params.set('provider', 'auto');
    params.set('lastUserMessage', query);
    if (refinementField) params.set('refinementField', refinementField);
    if (refinementValue) params.set('refinementValue', refinementValue);

    try {
      const res = await fetch(`/api/search?${params.toString()}`, { method: 'GET' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Search failed');
      }
      const data: ApiResponse = await res.json();

      if ('type' in data && data.type === 'refinement_question') {
        setRefinementQuestion({
          question: data.question,
          options: data.options,
          field: data.field,
          turn: data.turn,
          maxTurns: data.maxTurns,
          vertical: data.vertical,
          reason: data.reason,
        });
        setSearchState(data.searchState ?? state);
      } else if ('data' in data) {
        setResults({
          internalResults: data.data.internalResults ?? [],
          externalResults: data.data.externalResults ?? [],
          summary: data.data.summary ?? null,
        });
        setRefinementQuestion(null);
        setSearchState(state);
      } else {
        throw new Error('Unexpected search response shape');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setRefinementQuestion(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(
    (query: string) => {
      const state: SearchState = { rawQuery: query.trim() };
      setSearchState(state);
      runSearch(state);
    },
    [runSearch]
  );

  const searchWithState = useCallback(
    (state: SearchState) => {
      const normalized = { ...state, rawQuery: (state.rawQuery || '').trim() };
      if (!normalized.rawQuery) {
        setError('Query is required');
        return;
      }
      setSearchState(normalized);
      runSearch(normalized);
    },
    [runSearch]
  );

  const answerRefinement = useCallback(
    (field: string, value: string) => {
      const v = value.trim().toLowerCase();
      const next: Partial<SearchState> = {};
      if (field === 'priceIntent' && (v === 'cheap' || v === 'mid' || v === 'premium')) next.priceIntent = v as 'cheap' | 'mid' | 'premium';
      else if (field === 'condition' && (v === 'new' || v === 'used')) next.condition = v as 'new' | 'used';
      else if (field === 'category') next.category = value.trim().toLowerCase() || undefined;
      else if (field === 'brand') next.brand = value.trim() ? [value.trim()] : undefined;
      else if (field && value) next.attributes = { ...searchState.attributes, [field]: value };

      const mergedState = { ...searchState, ...next };
      setSearchState(mergedState);
      runSearch(mergedState, field, value);
    },
    [searchState, runSearch]
  );

  return {
    searchState,
    results,
    refinementQuestion,
    loading,
    error,
    search,
    searchWithState,
    answerRefinement,
  };
}
