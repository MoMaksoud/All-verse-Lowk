import { Search } from "lucide-react";
import { CameraButton } from "./CameraButton";
import { SearchButton } from "./SearchButton";

export function SearchBar() {
  return (
    <div className="flex h-[52px] w-full items-center gap-2.5 rounded-2xl border border-[#E5E7EB] bg-white pl-4 pr-2 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
      <Search className="h-4 w-4 shrink-0 text-[#6B7280]" strokeWidth={2} />
      <input
        type="text"
        placeholder="Search for electronics, fashion, shoes and more..."
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-[#111827] placeholder:text-[#6B7280] focus:outline-none"
      />
      <CameraButton />
      <SearchButton />
    </div>
  );
}
