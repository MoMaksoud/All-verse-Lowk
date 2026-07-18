import { TrendingSearchRow } from "./TrendingSearchRow";
import { trendingSearches } from "@/lib/mock-data";

export function TrendingSearchesSection() {
  return (
    <section className="mx-auto mt-16 mb-10 max-w-[1600px] px-8">
      <h2 className="mb-4 text-xl font-bold text-[#111827]">
        Trending Searches
      </h2>

      <div className="grid grid-cols-4 gap-x-6 gap-y-6">
        {trendingSearches.map((search) => (
          <TrendingSearchRow key={search.term} {...search} />
        ))}
      </div>
    </section>
  );
}
