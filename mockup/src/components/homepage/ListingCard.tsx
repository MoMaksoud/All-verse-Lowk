import Image from "next/image";
import type { Listing } from "@/types/homepage";
import { FavoriteButton } from "./FavoriteButton";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="group overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)]">
      <div className="relative aspect-square w-full">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 16vw, 45vw"
        />
        <FavoriteButton likes={listing.likes} />
      </div>

      <div className="p-3">
        <h3 className="truncate text-[13px] font-semibold text-[#111827]">
          {listing.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-[#6B7280]">{listing.meta}</p>
        <p className="mt-1.5 text-sm font-bold text-[#111827]">
          ${listing.price}
        </p>
      </div>
    </div>
  );
}
