"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function FavoriteButton({ likes }: { likes: number }) {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setActive((v) => !v);
      }}
      className="absolute right-2 top-2 flex h-6 items-center gap-1 rounded-full bg-white/95 px-2 text-[11px] font-medium text-[#111827] shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur"
    >
      <Heart
        className={cn(
          "h-3 w-3",
          active ? "fill-red-500 text-red-500" : "text-[#111827]"
        )}
        strokeWidth={2}
      />
      {likes + (active ? 1 : 0)}
    </button>
  );
}
