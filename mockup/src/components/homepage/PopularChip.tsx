export function PopularChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="h-7 shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3 text-xs text-[#374151] hover:bg-gray-50"
    >
      {label}
    </button>
  );
}
