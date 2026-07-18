import { StyleCard } from "./StyleCard";
import { styleCards } from "@/lib/mock-data";

export function ShopByStyleSection() {
  return (
    <section className="mx-auto mt-16 mb-10 max-w-[1600px] px-8">
      <h2 className="mb-4 text-xl font-bold text-[#111827]">Shop by Style</h2>

      <div className="flex flex-wrap items-start justify-between gap-y-6">
        {styleCards.map((card) => (
          <StyleCard key={card.id} {...card} />
        ))}
      </div>
    </section>
  );
}
