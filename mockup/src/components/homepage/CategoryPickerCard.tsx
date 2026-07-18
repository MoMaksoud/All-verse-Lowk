import Image from "next/image";
import type { CategoryPickerCardData } from "@/types/homepage";

export function CategoryPickerCard({ label, image }: CategoryPickerCardData) {
  return (
    <button
      type="button"
      className="group relative aspect-video w-full overflow-hidden rounded-2xl"
    >
      <Image
        src={image}
        alt={label}
        fill
        className="object-cover transition-transform duration-200 group-hover:scale-105"
        sizes="(min-width: 1024px) 24vw, 45vw"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute bottom-3 left-3 text-sm font-bold text-white">
        {label}
      </span>
    </button>
  );
}
