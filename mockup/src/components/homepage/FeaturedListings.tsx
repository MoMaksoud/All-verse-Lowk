import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { featuredListings } from "@/lib/mock-data";

export function FeaturedListings() {
  return (
    <section className="mx-auto mt-8 max-w-[1600px] px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#111827]">
          Featured Listings
        </h2>
        <Link
          href="/listings"
          className="flex items-center gap-0.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="grid grid-cols-6 gap-5">
        {featuredListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
