"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PopularItemCard } from "./PopularItemCard";
import { popularThisWeek } from "@/lib/mock-data";

function CarouselArrowButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Scroll left" : "Scroll right"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#111827] shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#2563EB] hover:text-white"
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
    </button>
  );
}

export function PopularCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="mx-auto mt-16 mb-10 max-w-[1600px] px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#111827]">Popular This Week</h2>
        <div className="flex items-center gap-2">
          <CarouselArrowButton direction="prev" onClick={() => scrollBy(-340)} />
          <CarouselArrowButton direction="next" onClick={() => scrollBy(340)} />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {popularThisWeek.map((listing) => (
          <div key={listing.id} className="w-[320px] shrink-0">
            <PopularItemCard listing={listing} />
          </div>
        ))}
      </div>
    </section>
  );
}
