import Link from "next/link";
import type { NavItemData } from "@/types/homepage";
import { cn } from "@/lib/utils";

export function NavItem({ label, href, icon: Icon, active }: NavItemData) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-[#EDF4FF] text-[#2563EB]"
          : "text-[#111827] hover:bg-gray-50"
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {label}
    </Link>
  );
}
