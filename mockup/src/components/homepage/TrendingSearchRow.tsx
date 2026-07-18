import Link from "next/link";
import type { TrendingSearchData } from "@/types/homepage";

export function TrendingSearchRow({ term, count }: TrendingSearchData) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(term)}`}
      className="group flex flex-col"
    >
      <span className="text-base font-bold text-[#111827] transition-colors group-hover:text-[#2563EB]">
        {term}
      </span>
      <span className="mt-1 text-xs text-[#6B7280]">{count}</span>
    </Link>
  );
}
