"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";

type Listing = {
  id: string;
  title: string;
  price: number;
  location?: string;
  imageUrl: string;
  createdAt?: string | Date;
};

type Props = {
  listing: Listing;
  view?: "comfortable" | "compact";
};

function ListingCardComponent({ listing, view = "comfortable" }: Props) {
  const padding = view === "comfortable" ? "p-4" : "p-3";
  const titleSize = "text-sm sm:text-base";
  const priceSize = "text-base sm:text-lg";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-200"
      aria-label={`View ${listing.title} for $${listing.price}`}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={listing.imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          priority={false}
        />
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      {/* Content */}
      <div className={`${padding} space-y-1.5`}>
        <h3 className={`${titleSize} font-semibold tracking-tight line-clamp-1`}>
          {listing.title}
        </h3>
        
        <div className="flex items-baseline justify-between gap-2">
          <span className={`${priceSize} font-semibold text-blue-600 dark:text-blue-400`}>
            ${listing.price.toLocaleString()}
          </span>
          {listing.location && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
              {listing.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export const ListingCard = memo(ListingCardComponent, (prev, next) => {
  return prev.listing.id === next.listing.id && prev.view === next.view;
});

