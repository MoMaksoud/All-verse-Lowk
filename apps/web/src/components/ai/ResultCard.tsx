type ResultCardProps = {
  title: string;
  image?: string | null;
  price?: string;
  rating?: number | null;
  badge?: string | null; // e.g., "Trending"
  onClick?: () => void;
};

export function ResultCard({ title, image, price, rating, badge, onClick }: ResultCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/30 transition"
    >
      {/* Badge */}
      {badge && (
        <div className="absolute left-3 top-3 z-10 text-[11px] px-2 py-1 rounded-full bg-rose-600/90 text-white font-medium">
          {badge}
        </div>
      )}
      
      {/* Image */}
      <div className="aspect-[4/3] w-full bg-zinc-950">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-zinc-600">No Image</div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3 text-left">
        <div className="line-clamp-2 text-zinc-100 text-sm font-medium">{title}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-zinc-300 text-sm">{price ?? "—"}</span>
          {typeof rating === "number" && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-200">
              ⭐ {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      
      <div className="absolute inset-0 ring-1 ring-inset ring-transparent group-hover:ring-zinc-600/30" />
    </button>
  );
}
