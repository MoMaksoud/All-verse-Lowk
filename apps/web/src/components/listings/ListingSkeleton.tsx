"use client";

type Props = {
  count?: number;
  view?: "comfortable" | "compact";
};

export function ListingSkeleton({ count = 12, view = "comfortable" }: Props) {
  const padding = view === "comfortable" ? "p-4" : "p-3";
  const gapClass = view === "comfortable" 
    ? "gap-6 sm:gap-7 lg:gap-8" 
    : "gap-4 sm:gap-5 lg:gap-6";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${gapClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden animate-pulse"
        >
          {/* Image skeleton */}
          <div className="relative w-full aspect-[4/3] bg-zinc-200 dark:bg-zinc-800" />
          
          {/* Content skeleton */}
          <div className={`${padding} space-y-2`}>
            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="flex items-baseline justify-between gap-2">
              <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

