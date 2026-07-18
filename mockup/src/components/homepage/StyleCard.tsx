import Image from "next/image";
import type { StyleCardData } from "@/types/homepage";

export function StyleCard({ label, image }: StyleCardData) {
  return (
    <button type="button" className="group flex w-33 shrink-0 flex-col items-center text-center">
      <div className="relative h-33 w-33 overflow-hidden rounded-full border border-[#E5E7EB] bg-[#FAFAFA]">
        <Image
          src={image}
          alt={label}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          sizes="132px"
        />
      </div>
      <p className="mt-3 text-sm font-bold text-[#111827]">{label}</p>
    </button>
  );
}
