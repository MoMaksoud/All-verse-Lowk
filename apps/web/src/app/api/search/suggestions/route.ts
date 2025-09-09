import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";
import { getAutocompleteSuggestions, trackSearch } from "@/lib/searchAnalytics";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || '';
  
  if (!query || query.length < 1) {
    return success({
      query: '',
      suggestions: [],
      count: 0
    });
  }
  
  // Track the search for analytics
  trackSearch(query);
  
  // Get suggestions using the Google-style system
  const suggestions = getAutocompleteSuggestions(query, 8);
  
  return success({
    query,
    suggestions: suggestions.map(s => s.text),
    count: suggestions.length,
    types: suggestions.map(s => s.type)
  });
});
