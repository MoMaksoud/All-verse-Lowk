import { ListingCardSkeleton } from '@/components/ListingCard';

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:px-8">
      <div className="mb-10 h-9 w-48 animate-pulse rounded bg-zinc-100" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
