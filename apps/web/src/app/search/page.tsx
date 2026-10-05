import { redirect } from "next/navigation";
import { serverSearch } from "@/lib/search/serverSearch";
import SearchClientShell from "@/components/search/SearchClientShell";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = typeof sp.query === "string" ? sp.query : "";
  const imageSearch = sp.imageSearch === "true";
  const debugSearch = sp.debugSearch === "1" || sp.debugSearch === "true";

  const brand = typeof sp.brand === "string" ? sp.brand : undefined;
  const model = typeof sp.model === "string" ? sp.model : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;

  const searchStateParam =
    typeof sp.searchState === "string" ? sp.searchState : undefined;
  const refinementField =
    typeof sp.refinementField === "string" ? sp.refinementField : undefined;
  const refinementValue =
    typeof sp.refinementValue === "string" ? sp.refinementValue : undefined;
  const refinementTurn =
    typeof sp.refinementTurn === "string" ? Number(sp.refinementTurn) : undefined;
  const queryRewrite =
    typeof sp.queryRewrite === "string" ? sp.queryRewrite : undefined;

  if (debugSearch) {
    console.warn("[search-debug][search-page] incoming params", {
      query,
      imageSearch,
      brand,
      model,
      category,
      searchStateParam,
      refinementField,
      refinementValue,
      refinementTurn,
      queryRewrite,
    });
  }

  if (!query) {
    // Nothing to search for: send people to browse instead of an empty page
    redirect("/listings");
  }

  const payload = await serverSearch({
    query,
    imageSearch,
    brand,
    model,
    category,
    debugSearch,
    searchStateParam,
    refinementField,
    refinementValue,
    refinementTurn,
    queryRewrite,
  });

  if (debugSearch) {
    console.info("[search-debug][search-page] serverSearch payload", {
      searchId: payload.searchId,
      hasResults: Boolean(payload.results),
      hasRefinementQuestion: Boolean(payload.refinementQuestion),
      error: payload.error,
      externalCount: payload.results?.externalResults?.length ?? 0,
      internalCount: payload.results?.internalResults?.length ?? 0,
    });
  }

  return (
    <div className="min-h-screen bg-white">

      <SearchClientShell
        initialQuery={payload.query}
        imageSearch={payload.imageSearch}
        initialResults={payload.results}
        initialRefinementQuestion={payload.refinementQuestion}
        initialError={payload.error}
        searchId={payload.searchId}
        debugSearch={debugSearch}
      />
    </div>
  );
}
