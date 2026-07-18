import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CategoryChip } from "./CategoryChip";
import { categories } from "@/lib/mock-data";

export function CategorySection() {
  return (
    <section className="mx-auto mb-10 mt-8 max-w-[1600px] px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#111827]">Shop by Category</h2>
        <Link
          href="/categories"
          className="flex items-center gap-0.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
        >
          View all categories
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {categories.map((category) => (
          <CategoryChip key={category.id} {...category} />
        ))}
      </div>
    </section>
  );
}
