"use client";

import ListingCard from "@/components/ListingCard";

type Listing = {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  category?: string;
  sellerId?: string;
  sellerProfile?: { username?: string; profilePicture?: string } | null;
  sold?: boolean;
};

type Props = {
  items: Listing[];
  view?: "comfortable" | "compact";
};

export function ListingGrid({ items, view = "comfortable" }: Props) {
  const gapClass = view === "comfortable"
    ? "gap-3 sm:gap-4 lg:gap-6 xl:gap-8"
    : "gap-2 sm:gap-3 lg:gap-4";

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 ${gapClass}`}>
      {items.map((item) => (
        <ListingCard
          key={item.id}
          variant="grid"
          id={item.id}
          title={item.title}
          description=""
          price={item.price}
          category={item.category || ""}
          imageUrl={item.imageUrl}
          sellerId={item.sellerId}
          sellerProfile={item.sellerProfile}
          sold={item.sold}
        />
      ))}
    </div>
  );
}

