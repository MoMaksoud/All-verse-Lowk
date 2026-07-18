import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SellButton() {
  return (
    <Button className="h-9 gap-1 rounded-lg bg-[#2563EB] px-3.5 text-[13px] font-semibold text-white hover:bg-[#1D4ED8]">
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      Sell
    </Button>
  );
}
