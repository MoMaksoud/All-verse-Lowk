"use client";

import { ListingCard } from "./ListingCard";

type Listing = {
  id: string;
  title: string;
  price: number;
  location?: string;
  imageUrl: string;
  createdAt?: string | Date;
};

type Props = {
  items: Listing[];
  view?: "comfortable" | "compact";
};

export function ListingGrid({ items, view = "comfortable" }: Props) {
  const gapClass = view === "comfortable" 
    ? "gap-6 sm:gap-7 lg:gap-8" 
    : "gap-4 sm:gap-5 lg:gap-6";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${gapClass}`}>
      {items.map((item) => (
        <ListingCard key={item.id} listing={item} view={view} />
      ))}
    </div>
  );
}

