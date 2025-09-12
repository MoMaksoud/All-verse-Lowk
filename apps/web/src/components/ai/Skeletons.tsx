export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
      <div className="aspect-[4/3] w-full bg-zinc-800/60" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-4/5 bg-zinc-800/60 rounded" />
        <div className="h-3 w-2/5 bg-zinc-800/60 rounded" />
      </div>
    </div>
  );
}
