import { CategoryPickerCard } from "./CategoryPickerCard";
import { categoryPickerCards } from "@/lib/mock-data";

export function CategoryPickerSection() {
  return (
    <section className="mt-16 w-full bg-[#FAFAFA] py-10">
      <div className="mx-auto max-w-[1600px] px-8">
        <h2 className="mb-4 text-xl font-bold text-[#111827]">
          What are you shopping for?
        </h2>

        <div className="grid grid-cols-4 gap-4">
          {categoryPickerCards.map((card) => (
            <CategoryPickerCard key={card.id} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
