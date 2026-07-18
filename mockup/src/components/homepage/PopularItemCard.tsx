import Image from "next/image";
import type { Listing } from "@/types/homepage";

export function PopularItemCard({ listing }: { listing: Listing }) {
  return (
    <div className="group">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#FAFAFA]">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          sizes="320px"
        />
      </div>
      <h3 className="mt-2 truncate text-sm font-semibold text-[#111827]">
        {listing.title}
      </h3>
    </div>
  );
}
