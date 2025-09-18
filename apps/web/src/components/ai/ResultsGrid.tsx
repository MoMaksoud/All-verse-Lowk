import { ResultCard } from "./ResultCard";

type Item = { 
  id: string; 
  title: string; 
  image?: string | null; 
  price?: string; 
  rating?: number | null; 
  badge?: string | null; 
  onClick?: () => void; 
};

export function ResultsGrid({ items, query }: { items: Item[]; query?: string }) {
  if (!items?.length) {
    return (
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="text-zinc-200 font-medium mb-1">No results</div>
          <div className="text-zinc-400 text-sm">
            {query ? <>We couldn't find matches for "{query}". Try a broader term.</> : "Try a different search."}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((it) => (
          <ResultCard key={it.id} {...it} />
        ))}
      </div>
    </div>
  );
}
