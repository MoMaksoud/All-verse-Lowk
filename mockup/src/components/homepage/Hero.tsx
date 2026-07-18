import Image from "next/image";
import { SearchBar } from "./SearchBar";
import { PopularChip } from "./PopularChip";
import { TrustBadgeRow } from "./TrustBadgeRow";
import { popularSearches } from "@/lib/mock-data";

export function Hero() {
  return (
    <section className="mx-auto mt-8 max-w-[1600px] px-8">
      <div className="grid h-[460px] grid-cols-[55%_45%] overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-[#FAFAFA] shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <div className="relative z-10 flex flex-col justify-center gap-3 px-12">

          <h1 className="text-[42px] font-bold leading-[1.1] tracking-tight text-[#111827]">
            Find Anything,
            <br />
            Anywhere
          </h1>

          <p className="max-w-[440px] text-base leading-relaxed text-[#6B7280]">
            One search. <span className="font-semibold text-[#111827]">Every</span>{" "}
            marketplace. AI-powered insights that help you buy smarter.
          </p>

          <SearchBar />

          <div className="flex flex-nowrap items-center gap-1.5">
            <span className="mr-1 shrink-0 text-xs text-[#6B7280]">Popular:</span>
            {popularSearches.map((term) => (
              <PopularChip key={term} label={term} />
            ))}
          </div>

          <div className="mt-3">
            <TrustBadgeRow />
          </div>
        </div>

        <div className="relative h-full w-full bg-[#FAFAFA]">
          <Image
            src="https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1200&q=80"
            alt="Sneakers styled on a light neutral studio background"
            fill
            priority
            className="object-cover"
            sizes="45vw"
          />
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FAFAFA] to-transparent" />
        </div>
      </div>
    </section>
  );
}
