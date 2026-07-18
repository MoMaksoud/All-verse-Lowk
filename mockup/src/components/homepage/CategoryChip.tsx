import type { CategoryData } from "@/types/homepage";

export function CategoryChip({ label, icon: Icon }: CategoryData) {
  return (
    <button
      type="button"
      className="flex shrink-0 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white py-2 pl-2 pr-4 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDF4FF] text-[#111827]">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <span className="text-[13px] font-medium text-[#111827]">{label}</span>
    </button>
  );
}
